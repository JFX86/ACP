
export interface Aircraft {
  id: string;
  name: string;
  url?: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  action: string;
  checked: boolean;
  isCritical?: boolean;
}

export interface ChecklistSection {
  id:string;
  title: string;
  items: ChecklistItem[];
  defaultChecked?: boolean;
}

export interface Checklist {
  id: string;
  title: string;
  aircrafts: Aircraft[];
  sections: ChecklistSection[];
  notes?: string;
}