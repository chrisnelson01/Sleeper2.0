import { motion } from "motion/react";
import footballImg from "../assets/d67f0282907cd80b21bf6f1a8efcd581573a39b7.png";

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-6"
      >
        <div className="relative w-32 h-32">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-accent rounded-full blur-3xl opacity-30 animate-pulse" />
          
          {/* Football with shimmer effect */}
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-full">
            <img 
              src={footballImg} 
              alt="Football" 
              className="w-20 h-20 object-contain relative z-10"
              style={{ filter: "brightness(0) saturate(100%) invert(70%) sepia(48%) saturate(2476%) hue-rotate(86deg) brightness(98%) contrast(119%)" }}
            />
            
            {/* Shimmer overlay that moves left to right */}
            <motion.div
              className="absolute inset-0 z-20"
              style={{
                background: "linear-gradient(90deg, transparent 0%, rgba(74, 222, 128, 0.6) 50%, transparent 100%)",
                backgroundSize: "200% 100%",
              }}
              animate={{
                backgroundPosition: ["200% 0%", "-200% 0%"],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          </div>
        </div>
        
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">Loading your league...</p>
        </div>

        <div className="flex gap-1.5 mt-4">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-accent rounded-full"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
