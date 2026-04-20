import { useState, useEffect } from 'react';
import { X, Calendar, CheckCircle2 } from 'lucide-react';
import { supabase, Resource, Booking } from '../lib/supabase';

interface BookingModalProps {
  resource: Resource | null;
  onClose: () => void;
}

export default function BookingModal({ resource, onClose }: BookingModalProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    organizer_name: '',
    organizer_email: '',
    organizer_phone: '',
    start_date: '',
    end_date: '',
    notes: ''
  });

  useEffect(() => {
    if (resource) {
      loadBookings();
    }
  }, [resource]);

  const loadBookings = async () => {
    if (!resource) return;

    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('resource_id', resource.id)
      .order('start_date', { ascending: true });

    if (!error && data) {
      setBookings(data);
    }
  };

  const isDateBooked = (date: string) => {
    return bookings.some(booking => {
      const startDate = new Date(booking.start_date);
      const endDate = new Date(booking.end_date);
      const checkDate = new Date(date);
      return checkDate >= startDate && checkDate <= endDate && booking.status !== 'cancelled';
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resource) return;

    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.end_date);

    if (endDate < startDate) {
      alert('La date de fin doit être après la date de début');
      return;
    }

    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      if (isDateBooked(dateStr)) {
        alert('Ces dates sont déjà réservées. Veuillez choisir d\'autres dates.');
        return;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('bookings').insert([
        {
          resource_id: resource.id,
          organizer_name: formData.organizer_name,
          organizer_email: formData.organizer_email,
          organizer_phone: formData.organizer_phone || null,
          start_date: formData.start_date,
          end_date: formData.end_date,
          status: 'pending',
          notes: formData.notes || null
        }
      ]);

      if (error) throw error;

      setShowSuccess(true);
      setTimeout(() => {
        onClose();
        setShowSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!resource) return null;

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{resource.name}</h2>
            <p className="text-gray-600 mt-1">{resource.price.toFixed(2)}€ / jour</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {showSuccess ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Réservation envoyée !
              </h3>
              <p className="text-gray-600">
                Le prestataire vous contactera bientôt pour confirmer.
              </p>
            </div>
          ) : (
            <>
              {bookings.length > 0 && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-2">
                        Dates déjà réservées
                      </h4>
                      <div className="space-y-1 text-sm text-blue-800">
                        {bookings.slice(0, 3).map((booking) => (
                          <div key={booking.id}>
                            Du {new Date(booking.start_date).toLocaleDateString('fr-FR')} au{' '}
                            {new Date(booking.end_date).toLocaleDateString('fr-FR')}
                          </div>
                        ))}
                        {bookings.length > 3 && (
                          <div className="text-blue-600 font-medium">
                            +{bookings.length - 3} autre(s) réservation(s)
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Vos informations
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Nom complet *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.organizer_name}
                        onChange={(e) => setFormData({ ...formData, organizer_name: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Jean Dupont"
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Email *
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.organizer_email}
                          onChange={(e) => setFormData({ ...formData, organizer_email: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder="email@example.com"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Téléphone
                        </label>
                        <input
                          type="tel"
                          value={formData.organizer_phone}
                          onChange={(e) => setFormData({ ...formData, organizer_phone: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder="+33 6 12 34 56 78"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Dates de réservation
                  </h3>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Date de début *
                      </label>
                      <input
                        type="date"
                        required
                        min={today}
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Date de fin *
                      </label>
                      <input
                        type="date"
                        required
                        min={formData.start_date || today}
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Notes / Remarques
                  </label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Informations supplémentaires..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isSubmitting ? 'Envoi en cours...' : 'Confirmer la réservation'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
