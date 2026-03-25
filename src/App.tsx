import { Toaster } from "./components/ui/sonner"
import { TooltipProvider } from "./components/ui/tooltip";
const App = () => {
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {/* Your content */}
      </div>
      
      {/* Add this here */}
      <Toaster position="top-right" expand={false} richColors />
    </TooltipProvider>
  )
}
export default App;