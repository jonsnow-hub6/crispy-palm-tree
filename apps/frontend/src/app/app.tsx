import { Button } from "@/components/ui/button";

export function App() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <h1 className="text-4xl font-bold mb-8">Nx + React + shadcn/ui</h1>
      <Button onClick={() => alert('Clicked!')}>Click me</Button>
    </div>
  );
}

export default App;
