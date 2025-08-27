const CosmicBackground = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* Flowing gradient streams */}
      <div className="absolute inset-0">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-[200vw] h-2 bg-gradient-flow opacity-60 cosmic-flow"
            style={{
              top: `${20 + i * 25}%`,
              animationDelay: `${i * 7}s`,
              transform: `rotate(${15 + i * 10}deg)`,
            }}
          />
        ))}
      </div>

      {/* Floating cosmic orbs - adjusted opacity for light mode */}
      <div className="absolute inset-0">
        <div className="absolute top-20 right-20 w-32 h-32 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-xl glow-pulse dark:opacity-100 opacity-60" />
        <div className="absolute bottom-32 left-20 w-24 h-24 bg-gradient-to-br from-secondary/20 to-primary/20 rounded-full blur-lg glow-pulse dark:opacity-100 opacity-60" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/3 w-16 h-16 bg-gradient-to-br from-accent/20 to-secondary/20 rounded-full blur-md glow-pulse dark:opacity-100 opacity-60" style={{ animationDelay: '2s' }} />
      </div>
    </div>
  );
};

export default CosmicBackground;