import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const CircularCards = () => {
  const circleRef = useRef(null);
  const navigate = useNavigate();

  const events = [
    { title: "Mariage", image: "https://images.unsplash.com/photo-1519741497674-611481863552" },
    { title: "Conférence", image: "https://images.unsplash.com/photo-1556761175-4b46a572b786" },
    { title: "Anniversaire", image: "https://images.unsplash.com/photo-1464349153735-7db50ed83c84" },
    { title: "Séminaire", image: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678" },
    { title: "Réunion", image: "https://images.unsplash.com/photo-1557426272-fc759fdf7a8d" },
    { title: "Festival", image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30" },
  ];

  useEffect(() => {
    let angle = 0;
    let animation;

    const rotate = () => {
      angle += 1; // plus fluide
      if (circleRef.current) {
        circleRef.current.style.transform = `rotate(${angle}deg)`;
      }
      animation = requestAnimationFrame(rotate);
    };

    rotate();
    return () => cancelAnimationFrame(animation);
  }, []);

  return (
    <div className="relative w-full h-screen bg-gray-100 overflow-hidden flex items-center">

      {/* Section gauche */}
      <div className="w-1/2 p-20 z-10">
        <h1 className="text-5xl font-bold text-gray-800 mb-6">
          Organisez vos événements
        </h1>
        <p className="text-gray-600 text-lg max-w-md">
          Planifiez facilement mariages, conférences et festivals
          avec notre plateforme Smart Event Planner.
        </p>
      </div>

      {/* Demi cercle droite */}
      <div className="absolute right-0 w-[900px] h-[900px] overflow-hidden">

        {/* Fond demi-cercle plus grand */}
        <div className="absolute right-0 w-[800px] h-[800px] bg-blue-100 rounded-l-full"></div>

        {/* Cercle animé */}
        <div
          ref={circleRef}
          className="absolute right-[-350px] top-[-7%] -translate-y-1/2 w-[900px] h-[900px] flex items-center justify-center"
        >
          {events.map((event, index) => {
            const angle = (index / events.length) * 360;
            const radius = 320; // rayon plus grand

            return (
              <div
                key={index}
                onClick={() => navigate("/les_ressources")}
                className="absolute w-56 h-56 rounded-full overflow-hidden shadow-2xl cursor-pointer border-4 border-white hover:scale-110 transition duration-300"
                style={{
                  transform: `
                    rotate(${angle}deg)
                    translate(${radius}px)
                    rotate(-${angle}deg)
                  `,
                }}
              >
                <img
                  src={event.image}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};

export default CircularCards;