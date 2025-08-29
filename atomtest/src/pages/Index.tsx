import CosmicBackground from "@/components/CosmicBackground";
import OpportunityTable from "@/components/OpportunityTable";

const Index = () => {
  return (
    <div className="min-h-screen bg-background relative">
      {/* Cosmic background effects */}
      <CosmicBackground />
      
      {/* Main content */}
      <div className="relative z-10">
        <main className="container mx-auto px-6 py-12">
          <OpportunityTable />
        </main>
      </div>
    </div>
  );
};

export default Index;
