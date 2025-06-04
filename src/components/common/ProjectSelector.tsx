
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Project } from "@/types/database";

interface ProjectSelectorProps {
  projects: Project[];
  selectedProject: string;
  onProjectChange: (projectId: string) => void;
}

export const ProjectSelector = ({ projects, selectedProject, onProjectChange }: ProjectSelectorProps) => {
  return (
    <Select value={selectedProject} onValueChange={onProjectChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select project" />
      </SelectTrigger>
      <SelectContent>
        {projects.map((project) => (
          <SelectItem key={project.id} value={project.id}>
            {project.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
