import React from 'react';

const AvailabilityCalendar = () => {
    const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

    // Simuler les jours disponibles/indisponibles (exemple pour Mars 2026)
    const availability = Array.from({ length: 31 }, (_, i) => {
        // Rendre certains jours indisponibles aléatoirement
        return Math.random() > 0.3; // 70% disponibles
    });

    return (
        <div className="bg-white rounded-2xl shadow-md p-6 transition-all duration-300 hover:shadow-lg">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Disponibilité</h3>
                <span className="text-sm text-gray-500">Mars 2026</span>
            </div>

            {/* Calendrier */}
            <div className="grid grid-cols-7 gap-2 mb-4">
                {/* En-têtes des jours */}
                {days.map((day, index) => (
                    <div key={`header-${index}`} className="text-center text-sm font-medium text-gray-500 py-2">
                        {day}
                    </div>
                ))}

                {/* Jours du calendrier */}
                {availability.map((available, index) => (
                    <div
                        key={`day-${index}`}
                        className={`
              aspect-square flex items-center justify-center text-sm rounded-lg
              transition-all duration-200 hover:scale-105 cursor-default
              ${available
                                ? 'bg-blue-50 text-blue-700 font-medium'
                                : 'bg-gray-100 text-gray-400'
                            }
            `}
                    >
                        {index + 1}
                    </div>
                ))}
            </div>

            {/* Légende */}
            <div className="flex items-center gap-6 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-100"></div>
                    <span className="text-sm text-gray-600">Disponible</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-200"></div>
                    <span className="text-sm text-gray-600">Indisponible</span>
                </div>
            </div>
        </div>
    );
};

export default AvailabilityCalendar;