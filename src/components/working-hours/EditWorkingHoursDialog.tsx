
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { WorkingHour, Profile, Client, Project } from "@/types/database";
import { useToast } from "@/hooks/use-toast";

interface EditWorkingHoursDialogProps {
  workingHour: WorkingHour | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const EditWorkingHoursDialog = ({
  workingHour,
  isOpen,
  onClose,
  onSave
}: EditWorkingHoursDialogProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    date: "",
    start_time: "",
    end_time: "",
    total_hours: 0,
    notes: ""
  });

  useEffect(() => {
    if (workingHour) {
      setFormData({
        date: workingHour.date,
        start_time: workingHour.start_time,
        end_time: workingHour.end_time,
        total_hours: workingHour.total_hours,
        notes: workingHour.notes || ""
      });
    }
  }, [workingHour]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workingHour) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('working_hours')
        .update(formData)
        .eq('id', workingHour.id);

      if (error) throw error;
      
      toast({ 
        title: "Success", 
        description: "Working hours updated successfully" 
      });
      
      onSave();
      onClose();
    } catch (error) {
      console.error('Error updating working hours:', error);
      toast({
        title: "Error",
        description: "Failed to update working hours",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!workingHour) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Working Hours</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_time">Start Time</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="end_time">End Time</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="total_hours">Total Hours</Label>
            <Input
              id="total_hours"
              type="number"
              step="0.5"
              value={formData.total_hours}
              onChange={(e) => setFormData({ ...formData, total_hours: parseFloat(e.target.value) || 0 })}
              required
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Hours"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
