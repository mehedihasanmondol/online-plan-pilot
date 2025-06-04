
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Client } from "@/types/database";

interface ClientSelectorProps {
  clients: Client[];
  selectedClient: string;
  onClientChange: (clientId: string) => void;
}

export const ClientSelector = ({ clients, selectedClient, onClientChange }: ClientSelectorProps) => {
  return (
    <Select value={selectedClient} onValueChange={onClientChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select client" />
      </SelectTrigger>
      <SelectContent>
        {clients.map((client) => (
          <SelectItem key={client.id} value={client.id}>
            {client.name} - {client.company}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
