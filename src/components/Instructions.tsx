import { Gamepad2 } from "lucide-react";

function Instructions() {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 max-w-2xl text-center">
      <h3 className="font-semibold mb-2 text-foreground flex items-center justify-center gap-2">
        <Gamepad2 className="h-5 w-5" />
        Controls
      </h3>
      <div className="text-sm text-muted-foreground space-y-1">
        <p>
          <strong>Mouse:</strong> Move to control paddle
        </p>
        <p>
          <strong>Keyboard:</strong> Arrow keys or A/D to move paddle
        </p>
        <p>
          <strong>Launch:</strong> SPACE or ENTER to launch ball
        </p>
        <p>
          <strong>Pause:</strong> P key to pause/resume
        </p>
        <p>
          <strong>Mobile:</strong> Touch and drag to control paddle
        </p>
      </div>
    </div>
  );
}

export default Instructions;
