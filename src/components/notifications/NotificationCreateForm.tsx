
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Profile } from "@/types/database";

interface NotificationCreateFormProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: Profile[];
  onSuccess: () => void;
}

export const NotificationCreateForm = ({ isOpen, onClose, profiles, onSuccess }: NotificationCreateFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isBulk, setIsBulk] = useState(false);
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    type: "custom" as const,
    priority: "medium" as "low" | "medium" | "high",
    action_type: "none" as const,
    recipient_profile_id: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isBulk && selectedProfiles.length === 0) {
        toast({
          title: "Error",
          description: "Please select at least one profile for bulk notification",
          variant: "destructive"
        });
        return;
      }

      if (!isBulk && !formData.recipient_profile_id) {
        toast({
          title: "Error",
          description: "Please select a recipient profile",
          variant: "destructive"
        });
        return;
      }

      const recipients = isBulk ? selectedProfiles : [formData.recipient_profile_id];
      
      for (const recipientId of recipients) {
        const { error } = await supabase
          .from('notifications')
          .insert({
            title: formData.title,
            message: formData.message,
            type: formData.type,
            priority: formData.priority,
            action_type: formData.action_type,
            recipient_profile_id: recipientId
          });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Notification${recipients.length > 1 ? 's' : ''} sent successfully`,
      });

      onSuccess();
      onClose();
      
      // Reset form
      setFormData({
        title: "",
        message: "",
        type: "custom",
        priority: "medium",
        action_type: "none",
        recipient_profile_id: ""
      });
      setSelectedProfiles([]);
      setIsBulk(false);
    } catch (error: any) {
      console.error('Error creating notification:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create notification",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileToggle = (profileId: string) => {
    setSelectedProfiles(prev => 
      prev.includes(profileId) 
        ? prev.filter(id => id !== profileId)
        : [...prev, profileId]
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Notification</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="bulk"
              checked={isBulk}
              onCheckedChange={setIsBulk}
            />
            <Label htmlFor="bulk">Send to multiple profiles (Bulk)</Label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Notification title"
                required
              />
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(value: "low" | "medium" | "high") => 
                  setFormData({ ...formData, priority: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="action_type">Action Type</Label>
              <Select 
                value={formData.action_type} 
                onValueChange={(value: "approve" | "confirm" | "grant" | "cancel" | "reject" | "none") => 
                  setFormData({ ...formData, action_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="approve">Approve</SelectItem>
                  <SelectItem value="confirm">Confirm</SelectItem>
                  <SelectItem value="grant">Grant</SelectItem>
                  <SelectItem value="cancel">Cancel</SelectItem>
                  <SelectItem value="reject">Reject</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Notification message"
              rows={3}
              required
            />
          </div>

          {!isBulk ? (
            <div>
              <Label htmlFor="recipient">Recipient *</Label>
              <Select 
                value={formData.recipient_profile_id} 
                onValueChange={(value) => setFormData({ ...formData, recipient_profile_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select recipient" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.full_name} ({profile.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div>
              <Label>Select Recipients ({selectedProfiles.length} selected)</Label>
              <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-2">
                {profiles.map((profile) => (
                  <div key={profile.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={profile.id}
                      checked={selectedProfiles.includes(profile.id)}
                      onCheckedChange={() => handleProfileToggle(profile.id)}
                    />
                    <Label htmlFor={profile.id} className="cursor-pointer">
                      {profile.full_name} ({profile.role})
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Sending..." : "Send Notification"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
