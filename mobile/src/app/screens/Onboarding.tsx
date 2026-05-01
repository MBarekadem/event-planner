import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/Button";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

const slides = [
  {
    image: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=80",
    title: "Wedding",
    subtitle: "Happily ever after starts now"
  },
  {
    image: "https://images.unsplash.com/photo-1555244162-803834f70033?w=800&q=80",
    title: "Catering",
    subtitle: "Make life delicious"
  },
  {
    image: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&q=80",
    title: "Photography",
    subtitle: "Memory is priceless"
  }
];

export function Onboarding() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      navigate("/login");
    }
  };

  const handleSkip = () => {
    navigate("/login");
  };

  return (
    <div className="h-screen bg-gradient-to-b from-purple-50 to-white flex flex-col max-w-[430px] mx-auto">
      <div className="flex justify-end p-6">
        <button onClick={handleSkip} className="text-purple-600 font-medium">
          Skip
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <ImageWithFallback
            src={slides[currentSlide].image}
            alt={slides[currentSlide].title}
            className="w-full h-80 object-cover rounded-[32px] shadow-2xl"
          />
        </div>

        <div className="mt-12 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            {slides[currentSlide].title}
          </h1>
          <p className="text-lg text-gray-600">
            {slides[currentSlide].subtitle}
          </p>
        </div>

        <div className="flex gap-2 mt-8">
          {slides.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${
                index === currentSlide
                  ? "w-8 bg-gradient-to-r from-[#A855F7] to-[#7C3AED]"
                  : "w-2 bg-gray-300"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="p-6">
        <Button onClick={handleNext} className="w-full">
          {currentSlide < slides.length - 1 ? "Next" : "Get Started"}
        </Button>
      </div>
    </div>
  );
}
