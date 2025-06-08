import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import { Profile, UserRole } from "@/types/database";

interface MultipleProfileSelectorProps {
  profiles: Profile[];
  selectedProfileIds: string[];
  onProfileSelect: (profileIds: string[]) => void;
  label?: string;
  placeholder?: string;
  showRoleFilter?: boolean;
  className?: string;
  disabled?: boolean;
}

export const MultipleProfileSelector = ({
  profiles,
  selectedProfileIds,
  onProfileSelect,
  label = "Select Profiles",
  placeholder = "Choose profiles",
  showRoleFilter = false,
  className = "",
  disabled = false
}: MultipleProfileSelectorProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");

  const filteredProfiles = profiles.filter(profile => {
    const matchesSearch = profile.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         profile.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || profile.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const selectedProfiles = profiles.filter(profile => 
    selectedProfileIds.includes(profile.id)
  );

  const handleProfileToggle = (profileId: string) => {
    if (disabled) return;
    
    const isSelected = selectedProfileIds.includes(profileId);
    if (isSelected) {
      onProfileSelect(selectedProfileIds.filter(id => id !== profileId));
    } else {
      onProfileSelect([...selectedProfileIds, profileId]);
    }
  };

  const handleRemoveProfile = (profileId: string) => {
    if (disabled) return;
    onProfileSelect(selectedProfileIds.filter(id => id !== profileId));
  };

  const roleOptions: { value: UserRole | "all"; label: string }[] = [
    { value: "all", label: "All Roles" },
    { value: "admin", label: "Admin" },
    { value: "employee", label: "Employee" },
    { value: "accountant", label: "Accountant" },
    { value: "operation", label: "Operation" },
    { value: "sales_manager", label: "Sales Manager" }
  ];

  return (
    <div className={className}>
      <Label className="text-sm font-medium mb-2 block">{label}</Label>
      
      {/* Selected profiles display */}
      <div className="mb-3">
        {selectedProfiles.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedProfiles.map(profile => (
              <Badge key={profile.id} variant="secondary" className="flex items-center gap-1">
                {profile.full_name}
                {!disabled && (
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                    onClick={() => handleRemoveProfile(profile.id)}
                  />
                )}
              </Badge>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground py-2">
            {placeholder}
          </div>
        )}
      </div>

      {/* Expand/Collapse button */}
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full justify-between"
        disabled={disabled}
      >
        {isExpanded ? "Hide" : "Show"} Profile Selection
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>

      {/* Profile selection area */}
      {isExpanded && !disabled && (
        <Card className="mt-3 p-4">
          <div className="space-y-4">
            {/* Search and filter controls */}
            <div className="flex gap-2">
              <Input
                placeholder="Search profiles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              {showRoleFilter && (
                <Select value={roleFilter} onValueChange={(value: UserRole | "all") => setRoleFilter(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Profile list */}
            <div className="max-h-64 overflow-y-auto space-y-2">
              {filteredProfiles.map(profile => (
                <div key={profile.id} className="flex items-center space-x-3 p-2 hover:bg-accent rounded">
                  <Checkbox
                    checked={selectedProfileIds.includes(profile.id)}
                    onCheckedChange={() => handleProfileToggle(profile.id)}
                    disabled={disabled}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{profile.full_name}</div>
                    <div className="text-xs text-muted-foreground truncate">{profile.email}</div>
                    <div className="text-xs text-muted-foreground capitalize">{profile.role}</div>
                  </div>
                </div>
              ))}
              {filteredProfiles.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No profiles found matching your criteria
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
