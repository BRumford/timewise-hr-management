import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Check, X, Edit2 } from "lucide-react";

interface DropdownEditProps {
  value: string;
  onSave: (value: string) => void;
  type?: 'text' | 'select' | 'status';
  options?: { value: string; label: string; color?: string }[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DropdownEdit({ 
  value, 
  onSave, 
  type = 'text',
  options = [],
  placeholder = "",
  className = "",
  disabled = false
}: DropdownEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-gray-100 text-gray-800",
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-blue-100 text-blue-800",
      rejected: "bg-red-100 text-red-800",
      draft: "bg-gray-100 text-gray-800",
      completed: "bg-green-100 text-green-800"
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  if (disabled) {
    return (
      <div className={`text-sm ${className}`}>
        {type === 'status' ? (
          <Badge className={getStatusColor(value)}>
            {value.replace('_', ' ')}
          </Badge>
        ) : (
          value
        )}
      </div>
    );
  }

  if (!isEditing) {
    return (
      <div className={`group flex items-center space-x-2 ${className}`}>
        {type === 'status' ? (
          <Badge className={getStatusColor(value)}>
            {value.replace('_', ' ')}
          </Badge>
        ) : (
          <span className="text-sm">{value}</span>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
          onClick={() => setIsEditing(true)}
        >
          <Edit2 className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {type === 'select' || type === 'status' ? (
        <Select value={editValue} onValueChange={setEditValue}>
          <SelectTrigger className="h-8 w-full">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          placeholder={placeholder}
          className="h-8"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
          autoFocus
        />
      )}
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0"
        onClick={handleSave}
      >
        <Check className="h-3 w-3 text-green-600" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0"
        onClick={handleCancel}
      >
        <X className="h-3 w-3 text-red-600" />
      </Button>
    </div>
  );
}