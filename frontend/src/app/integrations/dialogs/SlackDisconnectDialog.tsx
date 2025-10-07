import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface SlackDisconnectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isDisconnecting: boolean
  onConfirmDisconnect: () => void
}

export function SlackDisconnectDialog({
  open,
  onOpenChange,
  isDisconnecting,
  onConfirmDisconnect
}: SlackDisconnectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disconnect Slack Integration</DialogTitle>
          <DialogDescription>
            Are you sure you want to disconnect your Slack integration?
            This will remove access to your Slack workspace data and you'll need to reconnect to use Slack features again.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDisconnecting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirmDisconnect}
            disabled={isDisconnecting}
          >
            {isDisconnecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Disconnecting...
              </>
            ) : (
              "Disconnect Slack"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
