
import { ActionDropdown, ActionItem } from "@/components/ui/action-dropdown";
import { Edit, Trash2, Eye } from "lucide-react";
import { Roster as RosterType } from "@/types/database";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface RosterActionsProps {
  roster: RosterType;
  onEdit: (roster: RosterType) => void;
  onDelete: (id: string) => void;
  onView: (roster: RosterType) => void;
}

export const RosterActions = ({ roster, onEdit, onDelete, onView }: RosterActionsProps) => {
  const [isEditable, setIsEditable] = useState(true);

  useEffect(() => {
    checkRosterEditability();
  }, [roster.id]);

  const checkRosterEditability = async () => {
    try {
      const { data, error } = await supabase
        .from('working_hours')
        .select('id')
        .eq('roster_id', roster.id)
        .in('status', ['approved', 'paid'])
        .limit(1);

      if (error) {
        console.error('Error checking roster editability:', error);
        return;
      }

      const hasApprovedOrPaid = data && data.length > 0;
      setIsEditable(!hasApprovedOrPaid);
    } catch (error) {
      console.error('Error checking roster editability:', error);
    }
  };

  const canEditDelete = roster.status !== 'cancelled' && isEditable;

  const items: ActionItem[] = [
    {
      label: "View Details",
      onClick: () => onView(roster),
      icon: <Eye className="h-4 w-4" />
    }
  ];

  if (canEditDelete) {
    items.unshift(
      {
        label: "Edit",
        onClick: () => onEdit(roster),
        icon: <Edit className="h-4 w-4" />
      },
      {
        label: "Delete",
        onClick: () => onDelete(roster.id),
        icon: <Trash2 className="h-4 w-4" />,
        destructive: true
      }
    );
  }

  return <ActionDropdown items={items} />;
};
