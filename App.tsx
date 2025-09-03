



import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { Checklist, ChecklistItem, ChecklistSection, Aircraft } from './types';
import { INITIAL_CHECKLISTS } from './constants';
import { FaChevronDown, FaChevronUp, FaCheckDouble, FaSquareXmark, FaArrowUp, FaXmark } from 'react-icons/fa6';

// --- App State Type (Simplified) ---
interface AppState {
    checklists: Checklist[];
    usefulLinks: UsefulLink[];
}

interface UsefulLink {
  id: string;
  title: string;
  url: string;
}

const usePrevious = <T,>(value: T): T | undefined => {
    const ref = useRef<T | undefined>(undefined);
    useEffect(() => {
        ref.current = value;
    }, [value]);
    return ref.current;
};


// --- HELPER COMPONENTS (defined outside main App to prevent re-creation on re-renders) ---

const Header = React.forwardRef<HTMLElement, {}>((props, ref) => {
  return (
    <header ref={ref} className="bg-gray-800 shadow-lg p-2 sm:p-4 flex justify-between items-center sticky top-0 z-30">
      <h1 className="text-lg sm:text-2xl font-bold text-white tracking-wider">Aéroclub du Poitou</h1>
    </header>
  );
});

interface TabsComponentProps {
  mainTabs: { id: string; title: string; }[];
  checklists: Checklist[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const TabsComponent: React.FC<TabsComponentProps> = ({ mainTabs, checklists, activeTab, onTabChange }) => {
  const checklistTabs = checklists;

  const renderTab = (tab: { id: string; title: string }) => {
    const isActive = activeTab === tab.id;
    const tabTitle = tab.title.startsWith('F-') ? tab.title.substring(2) : tab.title;
    
    let specialBgClass = '';

    if (isActive) {
        if (tab.title.includes('F-BUBK')) {
            specialBgClass = 'bg-gradient-to-r from-orange-300/30 to-orange-400/30';
        } else if (tab.title.includes('F-GIYA')) {
            specialBgClass = 'bg-gradient-to-r from-green-300/30 to-green-400/30';
        } else if (tab.title.includes('DR400')) {
            specialBgClass = 'bg-gradient-to-r from-blue-900/40 via-red-900/20 to-red-900/40';
        } else if (tab.title.includes('F-HNNY')) {
            specialBgClass = 'bg-gradient-to-r from-yellow-400/30 to-orange-400/30';
        } else if (tab.title.includes('F-HPPL')) {
            specialBgClass = 'bg-gradient-to-r from-yellow-200/40 to-yellow-300/40';
        } else if (tab.title.includes('F-HMPI')) {
            specialBgClass = 'bg-gradient-to-r from-sky-300/30 to-sky-400/30';
        }
    }

    const tabClasses = [
      'relative group py-2 px-2 sm:px-3 text-sm sm:text-base font-medium transition-colors duration-200 uppercase tracking-wider flex-shrink-0 rounded-t-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
      isActive
        ? 'text-blue-400'
        : 'text-gray-400 hover:text-white',
       specialBgClass
    ]
      .filter(Boolean)
      .join(' ');
    return (
      <button key={tab.id} onClick={() => onTabChange(tab.id)} className={tabClasses}>
        {tabTitle}
        <span
          className={`absolute bottom-0 left-0 w-full h-0.5 bg-blue-400 transition-transform duration-300 ease-out transform-gpu ${
            isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
          }`}
          aria-hidden="true"
        />
      </button>
    );
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {mainTabs.map(tab => renderTab(tab))}
      </div>
      <div className="border-b border-gray-800 my-1"></div>
      <div className="flex items-center overflow-x-auto">
        {checklistTabs.map(tab => renderTab(tab))}
      </div>
    </div>
  );
};

interface SummaryComponentProps {
  checklists: Checklist[];
  onTabChange: (tabId: string) => void;
}

const SummaryComponent: React.FC<SummaryComponentProps> = ({ checklists, onTabChange }) => {
    const [filter, setFilter] = useState('');

    const summaryStructure = useMemo(() => {
        const findId = (title: string) => checklists.find(c => c.title === title)?.id;
        const dr400Id = checklists.find(c => c.id === 'dr400-1')?.id;

        return [
            {
                category: 'CESSNA',
                aircraft: [
                    { title: 'F-BUBK', checklistId: findId('F-BUBK') },
                    { title: 'F-GIYA', checklistId: findId('F-GIYA') },
                ].filter(ac => ac.checklistId)
            },
            {
                category: 'DR400',
                aircraft: [
                    { title: 'F-GLVX', checklistId: dr400Id },
                    { title: 'F-GKQA', checklistId: dr400Id },
                ].filter(ac => ac.checklistId)
            },
            {
                category: 'EVEKTOR',
                aircraft: [
                    { title: 'F-HNNY', checklistId: findId('F-HNNY') },
                    { title: 'F-HPPL', checklistId: findId('F-HPPL') },
                    { title: 'F-HMPI', checklistId: findId('F-HMPI') },
                ].filter(ac => ac.checklistId)
            }
        ];
    }, [checklists]);

    const filteredStructure = useMemo(() => {
        if (!filter.trim()) {
            return summaryStructure;
        }
        const lowercasedFilter = filter.toLowerCase();
        return summaryStructure
            .map(category => ({
                ...category,
                aircraft: category.aircraft.filter(ac =>
                    ac.title.toLowerCase().includes(lowercasedFilter)
                ),
            }))
            .filter(category => category.aircraft.length > 0);
    }, [filter, summaryStructure]);

    const totalMatches = filteredStructure.reduce((acc, cat) => acc + cat.aircraft.length, 0);


    return (
      <div className="p-4 sm:p-8 bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-white mb-6 uppercase tracking-wider">Sommaire des Checklists</h2>
        
        <div className="mb-6 relative">
            <input
                type="text"
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="w-full p-3 pr-10 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Filtrer par immatriculation..."
                aria-label="Filtrer les checklists par immatriculation"
            />
            {filter && (
                <button
                    onClick={() => setFilter('')}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-white transition-colors"
                    aria-label="Effacer le filtre"
                >
                    <FaXmark size={20} />
                </button>
            )}
        </div>
        
        <div className="space-y-6">
          {totalMatches > 0 ? (
            filteredStructure.map(category => (
              <div key={category.category}>
                <h3 className="text-xl font-semibold text-gray-300 border-b border-gray-700 pb-2 mb-3">{category.category}</h3>
                <ul className="space-y-3 pl-4">
                  {category.aircraft.map(ac => (
                    <li key={ac.title}>
                      <button
                        onClick={() => onTabChange(ac.checklistId!)}
                        className="text-lg text-blue-400 hover:underline"
                      >
                        {ac.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
           ) : (
            <p className="text-gray-400 italic">Aucune checklist ne correspond à votre recherche.</p>
           )}
        </div>

        <hr className="my-8 border-gray-700" />

        <ul className="space-y-3">
           <li>
              <button
                onClick={() => onTabChange('links')}
                className="text-lg text-blue-400 hover:underline text-left"
              >
                Liens
              </button>
           </li>
           <li>
              <button
                onClick={() => onTabChange('guide')}
                className="text-lg text-blue-400 hover:underline text-left"
              >
                Mode d'emploi
              </button>
           </li>
        </ul>
      </div>
    );
};

interface LinksComponentProps {
    links: UsefulLink[];
}

const LinksComponent: React.FC<LinksComponentProps> = ({ links }) => {
    return (
        <div className="p-4 sm:p-8 bg-gray-800 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold text-white mb-6 uppercase tracking-wider">Liens utiles</h2>
            <ul className="space-y-4">
                {links.map(link => (
                    <li key={link.id} className="group">
                        <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xl text-blue-400 hover:underline"
                        >
                            {link.title}
                        </a>
                    </li>
                ))}
            </ul>

            <hr className="my-8 border-gray-700" />
            <h2 className="text-2xl font-bold text-white mb-6 uppercase tracking-wider">Contact</h2>
            <p className="text-lg text-gray-300">
                Pour toute question ou suggestion, contacter l'adresse suivante :
            </p>
            <a
                href="mailto:aeroclubdupoitou86@gmail.com"
                className="text-xl text-blue-400 hover:underline mt-4 inline-block"
            >
                aeroclubdupoitou86@gmail.com
            </a>
            <div className="text-right text-xs text-sky-300 mt-8 italic">
                <p>créé par Julien FRADET</p>
                <p>Dernière mise à jour : 03 septembre 2025</p>
            </div>
        </div>
    );
};

const GuideComponent: React.FC = () => {
    const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <h3 className="text-xl font-bold text-blue-300 mt-6 mb-3">{children}</h3>
    );
    const SubSectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <h4 className="text-lg font-semibold text-white mt-4 mb-2">{children}</h4>
    );
    const ListItem: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <li className="ml-5 list-disc">{children}</li>
    );

    return (
        <div className="p-4 sm:p-8 bg-gray-800 rounded-lg shadow-lg text-gray-300 prose prose-invert max-w-none">
            <h2 className="text-2xl font-bold text-white mb-6 uppercase tracking-wider">Mode d'emploi de l'application</h2>

            <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded-lg p-4 mb-8">
                <h3 className="text-xl font-bold text-blue-300 mt-0 mb-3">Installer l'application sur votre appareil</h3>
                <p>Pour une utilisation hors ligne optimale (en vol), il est fortement recommandé d'installer l'application sur votre smartphone ou tablette.</p>
                <SubSectionTitle>Sur Android (avec Chrome)</SubSectionTitle>
                <ol className="list-decimal ml-5 space-y-1">
                    <li>Ouvrez le menu de Chrome (les trois points en haut à droite).</li>
                    <li>Sélectionnez <strong>"Installer l'application"</strong> ou <strong>"Ajouter à l'écran d'accueil"</strong>.</li>
                    <li>Suivez les instructions pour l'ajouter.</li>
                </ol>
                <SubSectionTitle>Sur iOS (iPhone/iPad avec Safari)</SubSectionTitle>
                 <ol className="list-decimal ml-5 space-y-1">
                    <li>Appuyez sur l'icône de partage (le carré avec une flèche vers le haut).</li>
                    <li>Faites défiler vers le bas et sélectionnez <strong>"Sur l'écran d'accueil"</strong>.</li>
                    <li>Confirmez en appuyant sur "Ajouter".</li>
                </ol>
                <p className="mt-4">Une fois installée, l'icône de l'application apparaîtra sur votre écran d'accueil et vous pourrez la lancer même sans connexion internet.</p>
            </div>
            
            <p>Bienvenue sur l'application de checklists de l'Aéroclub du Poitou. Ce guide vous aidera à maîtriser toutes ses fonctionnalités.</p>

            <SectionTitle>Navigation de base</SectionTitle>
            <p>La navigation se fait via la barre d'onglets en haut de l'écran :</p>
            <ul>
                <ListItem><strong>Sommaire :</strong> Affiche la liste de toutes les checklists disponibles. C'est le point d'entrée principal.</ListItem>
                <ListItem><strong>Liens :</strong> Contient une liste de liens utiles (OpenFlyers, Coin des pilotes, etc.).</ListItem>
                <ListItem><strong>Mode d'emploi :</strong> Cette page que vous consultez actuellement.</ListItem>
                <ListItem><strong>Onglets des avions (DR400, C150, etc.) :</strong> Chaque onglet correspond à une checklist spécifique.</ListItem>
            </ul>
            
            <SectionTitle>Utilisation de la Checklist</SectionTitle>
            
            <SubSectionTitle>Utilisation de la checklist</SubSectionTitle>
            <ul>
                <ListItem><strong>Cocher un item :</strong> Appuyez sur la case à cocher à droite de chaque ligne.</ListItem>
                <ListItem><strong>Surlignage bleu :</strong> Le prochain item à vérifier est surligné en bleu pour vous guider. L'application défile automatiquement pour le garder visible.</ListItem>
                <ListItem><strong>Avertissement rouge :</strong> Si vous cochez un item alors qu'un précédent a été oublié, l'item oublié sera surligné en rouge. Un bandeau d'avertissement apparaîtra également en haut de l'écran.</ListItem>
                <ListItem><strong>Sections critiques :</strong> Les sections "URGENCES" et "DETRESSE" sont colorées en rouge et orange pour une identification rapide.</ListItem>
            </ul>

            <SubSectionTitle>Fonctionnalités Clés</SubSectionTitle>
            <ul>
                <ListItem><strong>Filtrage rapide :</strong> Une barre de recherche apparaît en haut de chaque checklist. Tapez-y pour filtrer instantanément les items par nom ou action, idéal pour retrouver une information précise rapidement.</ListItem>
                <ListItem><strong>Gestion des sections :</strong> Appuyez sur le titre d'une section pour la replier ou la déplier. Une section se replie automatiquement lorsque tous ses items sont cochés.</ListItem>
            </ul>

            <SubSectionTitle>Boutons d'Action Rapide</SubSectionTitle>
            <p>En haut de chaque checklist, deux boutons couvrant toute la largeur vous aident à gérer l'affichage :</p>
            <ul>
                <ListItem><strong>Replier / Déplier toutes les sections :</strong> Ce bouton change de fonction. Par défaut, il permet de replier toutes les sections. Une fois activé, il se transforme pour tout déplier d'un coup.</ListItem>
                <ListItem><strong>Réinitialiser :</strong> Ce bouton décoche tous les items, vous préparant pour une nouvelle utilisation.</ListItem>
            </ul>
            
            <SectionTitle>Contact</SectionTitle>
            <p>Pour toute question, suggestion ou si vous constatez un bug, n'hésitez pas à envoyer un mail à <a href="mailto:aeroclubdupoitou86@gmail.com" className="text-blue-400 hover:underline">aeroclubdupoitou86@gmail.com</a>.</p>
        </div>
    );
};

// --- Confirmation Dialog Component ---
interface ConfirmationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);
    
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50"
            aria-labelledby="confirmation-dialog-title"
            role="dialog"
            aria-modal="true"
            onClick={onClose}
        >
            <div 
                className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm m-4 border border-gray-700"
                onClick={e => e.stopPropagation()}
            >
                <h2 id="confirmation-dialog-title" className="text-xl font-bold text-white mb-4">{title}</h2>
                <p className="text-gray-300 mb-6">{message}</p>
                <div className="flex justify-end gap-4">
                    <button 
                        onClick={onClose} 
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-white font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
                    >
                        Annuler
                    </button>
                    <button 
                        onClick={onConfirm} 
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-white font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                        Confirmer
                    </button>
                </div>
            </div>
        </div>
    );
};


interface ChecklistComponentProps {
    checklist: Checklist;
    onChecklistChange: (updatedChecklist: Checklist) => void;
    stickyTopOffset: number;
}

const ChecklistComponent: React.FC<ChecklistComponentProps> = ({ checklist, onChecklistChange, stickyTopOffset }) => {
    const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
    const [warningItemIds, setWarningItemIds] = useState<Set<string>>(new Set());
    const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
    const [filterText, setFilterText] = useState<string>('');
    const [isResetConfirmVisible, setIsResetConfirmVisible] = useState(false);
    const itemRefs = useRef<Record<string, HTMLLIElement | null>>({});
    const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const shouldScrollAfterCheck = useRef(false);
    const prevSections = usePrevious(checklist.sections);

    // Effect to automatically collapse/expand sections when their completion state changes.
    useEffect(() => {
        if (!prevSections) return;

        checklist.sections.forEach(section => {
            const prevSection = prevSections.find(s => s.id === section.id);
            if (!prevSection) return; 

            const wasComplete = prevSection.items.length > 0 && prevSection.items.every(item => item.checked);
            const isNowComplete = section.items.length > 0 && section.items.every(item => item.checked);
            
            // Collapse section when it becomes complete
            if (isNowComplete && !wasComplete) {
                setCollapsedSections(prev => {
                    if (prev.has(section.id)) return prev;
                    const newSet = new Set(prev);
                    newSet.add(section.id);
                    return newSet;
                });
            } 
            // Expand section when it becomes incomplete
            else if (wasComplete && !isNowComplete) {
                setCollapsedSections(prev => {
                    if (!prev.has(section.id)) return prev;
                    const newSet = new Set(prev);
                    newSet.delete(section.id);
                    return newSet;
                });
            }
        });
    }, [checklist.sections, prevSections]);


    const handleResetChecks = useCallback(() => {
        const updatedSections = checklist.sections.map(section => ({
            ...section,
            items: section.items.map(item => ({ ...item, checked: false }))
        }));
        onChecklistChange({ ...checklist, sections: updatedSections });
        setWarningItemIds(new Set());
        setCollapsedSections(new Set());
    }, [checklist, onChecklistChange]);

    const filteredSections = useMemo(() => {
        if (!filterText.trim()) {
            return checklist.sections;
        }
        const lowercasedFilter = filterText.toLowerCase();
        
        return checklist.sections
            .map(section => ({
                ...section,
                items: section.items.filter(item =>
                    item.label.toLowerCase().includes(lowercasedFilter) ||
                    item.action.toLowerCase().includes(lowercasedFilter)
                ),
            }))
            .filter(section => section.items.length > 0);
    }, [checklist.sections, filterText]);

    const scrollToElement = useCallback((element: HTMLElement) => {
        if (!element) return;
        const warningBanner = document.querySelector<HTMLElement>('.bg-red-900.sticky');
        const bannerHeight = warningBanner?.offsetHeight ?? 0;
        
        const topOffset = stickyTopOffset + bannerHeight;
        
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.scrollY - topOffset - 20; // 20px padding
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }, [stickyTopOffset]);

    const handleToggleSection = (sectionId: string) => {
        setCollapsedSections(prev => {
            const newCollapsed = new Set(prev);
            if (newCollapsed.has(sectionId)) {
                newCollapsed.delete(sectionId);
            } else {
                newCollapsed.add(sectionId);
            }
            return newCollapsed;
        });
    };
    
    const scrollToSection = useCallback((element: HTMLElement) => {
        if (!element) return;
        const warningBanner = document.querySelector<HTMLElement>('.bg-red-900.sticky');
        const bannerHeight = warningBanner?.offsetHeight ?? 0;
        
        const topOffset = stickyTopOffset + bannerHeight;
        
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.scrollY - topOffset - 10; // 10px padding
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }, [stickyTopOffset]);

    const handleSummaryClick = (sectionId: string) => {
        const sectionElement = sectionRefs.current[sectionId];
        if (sectionElement) {
            // If the section is collapsed, expand it first
            if (collapsedSections.has(sectionId)) {
                handleToggleSection(sectionId);
            }
            // Scroll to it after a short delay to allow for expansion animation
            setTimeout(() => {
                scrollToSection(sectionElement);
            }, 50);
        }
    };

    useEffect(() => {
        const allFlatItems = checklist.sections.flatMap(s => s.items);
        const newWarningIds = new Set<string>();
        let lastCheckedIndex = -1;

        for (let i = allFlatItems.length - 1; i >= 0; i--) {
            if (allFlatItems[i].checked) {
                lastCheckedIndex = i;
                break;
            }
        }

        if (lastCheckedIndex > 0) {
            for (let i = 0; i < lastCheckedIndex; i++) {
                if (!allFlatItems[i].checked) {
                    newWarningIds.add(allFlatItems[i].id);
                }
            }
        }
        setWarningItemIds(newWarningIds);
        
        const firstUncheckedItem = allFlatItems.find(item => !item.checked);
        
        if (firstUncheckedItem && !newWarningIds.has(firstUncheckedItem.id)) {
            setHighlightedItemId(firstUncheckedItem.id);
        } else {
            setHighlightedItemId(null);
        }

    }, [checklist.sections]);

    useEffect(() => {
        if (shouldScrollAfterCheck.current) {
            shouldScrollAfterCheck.current = false; 
            if (highlightedItemId) {
                const element = itemRefs.current[highlightedItemId];
                if (element) {
                    setTimeout(() => scrollToElement(element), 50);
                }
            }
        }
    }, [highlightedItemId, scrollToElement]);

    useEffect(() => {
        if (!highlightedItemId) return;

        const sectionContainingHighlight = checklist.sections.find(section => 
            section.items.some(item => item.id === highlightedItemId)
        );

        if (sectionContainingHighlight) {
            setCollapsedSections(currentCollapsed => {
                if (currentCollapsed.has(sectionContainingHighlight.id)) {
                    const newCollapsed = new Set(currentCollapsed);
                    newCollapsed.delete(sectionContainingHighlight.id);
                    return newCollapsed;
                }
                return currentCollapsed;
            });
        }
    }, [highlightedItemId, checklist.sections]);

    // Since the component is re-mounted on checklist change (due to `key` prop),
    // this effect sets the initial collapsed state on first render.
    useEffect(() => {
        const completedSectionIds = new Set(
            checklist.sections
                .filter(section => section.items.length > 0 && section.items.every(item => item.checked))
                .map(section => section.id)
        );
        setCollapsedSections(completedSectionIds);
    }, [checklist.sections]); 
    
    const handleCheck = useCallback((sectionId: string, itemId: string) => {
        const newSections = checklist.sections.map(section => {
            if (section.id !== sectionId) return section;
            const newItems = section.items.map(item =>
                item.id === itemId ? { ...item, checked: !item.checked } : item
            );
            return { ...section, items: newItems };
        });

        onChecklistChange({ ...checklist, sections: newSections });
        shouldScrollAfterCheck.current = true;
    }, [checklist, onChecklistChange]);
    
    const handleCheckAllInSection = (sectionId: string) => {
        const updatedSections = checklist.sections.map(section => {
            if (section.id === sectionId) {
                return { ...section, items: section.items.map(item => ({ ...item, checked: true })) };
            }
            return section;
        });

        onChecklistChange({ ...checklist, sections: updatedSections });
    };

    const handleUncheckAllInSection = (sectionId: string) => {
        const updatedSections = checklist.sections.map(section => {
            if (section.id === sectionId) {
                return { ...section, items: section.items.map(item => ({...item, checked: false }))};
            }
            return section;
        });
        onChecklistChange({...checklist, sections: updatedSections});
    };

    const handleExpandAll = () => {
        setCollapsedSections(new Set());
    };

    const handleCollapseAll = () => {
        const allSectionIds = new Set(checklist.sections.map(s => s.id));
        setCollapsedSections(allSectionIds);
    };
    
    const isAllCollapsed = collapsedSections.size === checklist.sections.length;

    return (
        <div className="relative">
            <ConfirmationDialog
                isOpen={isResetConfirmVisible}
                onClose={() => setIsResetConfirmVisible(false)}
                onConfirm={() => {
                    handleResetChecks();
                    setIsResetConfirmVisible(false);
                }}
                title="Confirmer la réinitialisation"
                message="Êtes-vous sûr de vouloir décocher tous les items de cette checklist ?"
            />
             {warningItemIds.size > 0 && (
                <div 
                    className="bg-red-900 text-white p-3 font-bold text-center sticky z-20 shadow-lg"
                    style={{ top: `${stickyTopOffset}px` }}
                >
                    Attention : {warningItemIds.size} item(s) précédent(s) non coché(s) !
                </div>
            )}
            <div className="p-4 sm:p-6">
                <div className="space-y-4 mb-6">
                    <div className="bg-gray-800 rounded-lg p-4">
                        <div className="flex flex-wrap gap-x-4 gap-y-2 items-center">
                            <h3 className="text-white font-bold text-lg">Avions :</h3>
                             {checklist.aircrafts.map(aircraft => (
                                 <a 
                                    key={aircraft.id} 
                                    href={aircraft.url}
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                                 >
                                    {aircraft.name}
                                 </a>
                             ))}
                        </div>
                    </div>

                    <div className="bg-gray-800 rounded-lg p-4">
                        <h4 className="text-white font-bold mb-2">Sommaire de la checklist :</h4>
                        <div className="flex flex-wrap gap-2">
                            {checklist.sections.map(section => {
                                const isSectionComplete = section.items.length > 0 && section.items.every(item => item.checked);
                                const isUrgent = section.title.includes('URGENCES');
                                const isDistress = section.title.includes('DETRESSE');

                                const summaryItemClasses = [
                                    'px-3 py-1 rounded-md text-white text-sm font-medium cursor-pointer transition-transform transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400',
                                    isUrgent ? 'bg-red-800 hover:bg-red-700' :
                                    isDistress ? 'bg-orange-700 hover:bg-orange-600' :
                                    isSectionComplete ? 'bg-green-800 hover:bg-green-700' :
                                    'bg-gray-600 hover:bg-gray-500'
                                ].join(' ');

                                return (
                                    <button
                                        key={section.id}
                                        onClick={() => handleSummaryClick(section.id)}
                                        className={summaryItemClasses}
                                    >
                                        {section.title}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    
                    <div className="bg-gray-800 rounded-lg p-4">
                        <div className="flex gap-2">
                            <button
                                onClick={isAllCollapsed ? handleExpandAll : handleCollapseAll}
                                className="flex-1 p-2 bg-blue-800 hover:bg-blue-700 rounded-md text-white font-semibold transition-colors flex items-center justify-center gap-2"
                            >
                                {isAllCollapsed ? <FaChevronDown /> : <FaChevronUp />}
                                {isAllCollapsed ? 'Déplier tout' : 'Replier tout'}
                            </button>
                            <button
                                onClick={() => setIsResetConfirmVisible(true)}
                                className="flex-1 p-2 bg-blue-600 hover:bg-blue-500 rounded-md text-white font-semibold transition-colors flex items-center justify-center gap-2"
                            >
                                <FaSquareXmark />
                                Réinitialiser (tout décocher)
                            </button>
                        </div>
                    </div>
                    
                    <div className="bg-gray-800 rounded-lg p-4">
                        <div className="relative">
                            <input
                                type="text"
                                value={filterText}
                                onChange={e => setFilterText(e.target.value)}
                                className="w-full p-3 pr-10 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Filtrer les items..."
                                aria-label="Filtrer les items de la checklist"
                            />
                            {filterText && (
                                <button
                                    onClick={() => setFilterText('')}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-white transition-colors"
                                    aria-label="Effacer le filtre"
                                >
                                    <FaXmark size={20} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    {filteredSections.map((section, sectionIndex) => {
                        const isCollapsed = collapsedSections.has(section.id);
                        const isSectionComplete = section.items.length > 0 && section.items.every(item => item.checked);
                        const isUrgent = section.title.includes('URGENCES');
                        const isDistress = section.title.includes('DETRESSE');

                        const sectionHeaderClasses = [
                            'p-3 sm:p-4 rounded-t-lg cursor-pointer flex justify-between items-center transition-all duration-300',
                            isCollapsed ? 'rounded-b-lg' : '',
                            isUrgent && isSectionComplete ? 'bg-red-800 bg-opacity-70 hover:bg-opacity-90' :
                            isUrgent ? 'bg-red-800 bg-opacity-70 hover:bg-opacity-90' :
                            isDistress ? 'bg-orange-700 bg-opacity-70 hover:bg-opacity-90' :
                            isSectionComplete ? 'bg-green-800 bg-opacity-40 hover:bg-opacity-60' :
                            'bg-gray-700 hover:bg-gray-600'
                        ].join(' ');

                        return (
                            <div key={section.id} ref={el => { sectionRefs.current[section.id] = el; }}>
                                <div
                                    className={sectionHeaderClasses}
                                    role="button"
                                    tabIndex={0}
                                    aria-expanded={!isCollapsed}
                                    aria-controls={`section-content-${section.id}`}
                                    onClick={() => handleToggleSection(section.id)}
                                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleToggleSection(section.id)}
                                >
                                     <div className="flex items-center gap-3 text-white" >
                                        <div className="flex-shrink-0">
                                            {isCollapsed ? <FaChevronDown size={20} /> : <FaChevronUp size={20} />}
                                        </div>
                                        <h3 className="text-base sm:text-lg font-bold uppercase tracking-wider">{section.title}</h3>
                                    </div>
                                    <div className="flex items-center text-white">
                                        {!filterText.trim() && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    isSectionComplete ? handleUncheckAllInSection(section.id) : handleCheckAllInSection(section.id);
                                                }}
                                                className="p-2 rounded-full hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                                                aria-label={isSectionComplete ? `Décocher tous les items de la section ${section.title}` : `Cocher tous les items de la section ${section.title}`}
                                                title={isSectionComplete ? "Tout décocher" : "Tout cocher"}
                                            >
                                                {isSectionComplete ? <FaSquareXmark size={20} /> : <FaCheckDouble size={20} />}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {!isCollapsed && (
                                    <div id={`section-content-${section.id}`} className="bg-gray-800 rounded-b-lg overflow-hidden">
                                        <ul className="divide-y divide-gray-700">
                                            {section.items.map((item, itemIndex) => {
                                                const isHighlighted = highlightedItemId === item.id;
                                                const isWarning = warningItemIds.has(item.id);
                                                
                                                const liClasses = [
                                                    "p-3 sm:p-4 flex gap-4 items-center transition-colors duration-300",
                                                    isWarning ? "bg-red-900 bg-opacity-50" : "",
                                                    isHighlighted ? "bg-blue-900 bg-opacity-50" : "",
                                                    item.isCritical ? "border-l-4 border-red-500" : ""
                                                ].filter(Boolean).join(" ");
                                                
                                                return (
                                                    <li
                                                        key={item.id}
                                                        ref={el => { itemRefs.current[item.id] = el; }}
                                                        className={liClasses}
                                                    >
                                                        <div className="min-w-0 flex-1">
                                                            <p id={`label-for-${item.id}`} className="font-semibold text-white">{item.label}</p>
                                                            <p className="text-gray-400 text-sm mt-1 text-right">{item.action}</p>
                                                        </div>
                                                        <div className="flex items-center">
                                                            <input
                                                                type="checkbox"
                                                                id={item.id}
                                                                checked={item.checked}
                                                                onChange={() => handleCheck(section.id, item.id)}
                                                                className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 cursor-pointer"
                                                                aria-labelledby={`label-for-${item.id}`}
                                                            />
                                                            <label htmlFor={item.id} className="sr-only">
                                                                Cocher {item.label}
                                                            </label>
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const App: React.FC = () => {
    const LOCAL_STORAGE_KEY = 'acpChecklistsState_v3';

    const [mainTabs] = useState([
        { id: 'summary', title: 'Sommaire' },
        { id: 'links', title: 'Liens' },
        { id: 'guide', title: 'Mode d\'emploi' }
    ]);

    const [activeTab, setActiveTab] = useState<string>('summary');

    const [appState, setAppState] = useState<AppState>(() => {
        try {
            const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (savedState) {
                const parsedState = JSON.parse(savedState);
                if (
                    parsedState.checklists && Array.isArray(parsedState.checklists) &&
                    parsedState.usefulLinks && Array.isArray(parsedState.usefulLinks) &&
                    parsedState.checklists.every((c: any) => 
                        c.sections && Array.isArray(c.sections) && c.sections.every((s: any) => s.items && Array.isArray(s.items))
                    )
                ) {
                    return parsedState as AppState;
                }
            }
        } catch (error) {
            console.error("Error loading state from localStorage", error);
        }
        return {
            checklists: INITIAL_CHECKLISTS,
            usefulLinks: [
                { id: 'link-1', title: 'OpenFlyers', url: 'https://openflyers.com/acp/' },
                { id: 'link-2', title: 'Le Coin des Pilotes', url: 'https://www.aero-club-poitou.fr/acp/coin-des-pilotes' },
            ]
        };
    });

    const { checklists, usefulLinks } = appState;

    useEffect(() => {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(appState));
        } catch (error) {
            console.error("Error saving state to localStorage", error);
        }
    }, [appState]);

    const handleChecklistChange = useCallback((updatedChecklist: Checklist) => {
        setAppState(prevState => ({
            ...prevState,
            checklists: prevState.checklists.map(c => 
                c.id === updatedChecklist.id ? updatedChecklist : c
            )
        }));
    }, []);
  
    const [scrollToTopVisible, setScrollToTopVisible] = useState(false);
    const headerRef = useRef<HTMLElement>(null);
    const navRef = useRef<HTMLElement>(null);
    const [headerHeight, setHeaderHeight] = useState(0);
    const [stickyTopOffset, setStickyTopOffset] = useState(0);

    useEffect(() => {
        const headerEl = headerRef.current;
        if (!headerEl) return;

        const observer = new ResizeObserver(() => {
            setHeaderHeight(headerEl.offsetHeight);
        });

        observer.observe(headerEl);

        return () => {
            observer.disconnect();
        };
    }, []);

    useEffect(() => {
        const calculateOffset = () => {
            const navHeight = navRef.current?.offsetHeight ?? 0;
            setStickyTopOffset(headerHeight + navHeight);
        };
        
        const timeoutId = setTimeout(calculateOffset, 50);

        window.addEventListener('resize', calculateOffset);
        window.addEventListener('orientationchange', calculateOffset);

        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', calculateOffset);
            window.removeEventListener('orientationchange', calculateOffset);
        };
    }, [activeTab, headerHeight]);

    useEffect(() => {
        const toggleVisibility = () => {
            if (window.scrollY > (headerHeight + 100)) {
                setScrollToTopVisible(true);
            } else {
                setScrollToTopVisible(false);
            }
        };

        window.addEventListener('scroll', toggleVisibility);
        return () => window.removeEventListener('scroll', toggleVisibility);
    }, [headerHeight]);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    const handleTabChange = useCallback((tabId: string) => {
        setActiveTab(tabId);
        window.scrollTo({ top: 0, behavior: 'auto' });
    }, []);

    const activeChecklist = checklists.find(c => c.id === activeTab);

    return (
        <div className="min-h-screen bg-gray-900">
            <Header ref={headerRef} />
            <nav 
                ref={navRef} 
                className="p-2 sm:p-4 bg-gray-900 sticky z-20 shadow-md" 
                style={{ top: `${headerHeight}px` }}
            >
                <TabsComponent 
                    mainTabs={mainTabs} 
                    checklists={checklists} 
                    activeTab={activeTab} 
                    onTabChange={handleTabChange}
                />
            </nav>

            <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
                {activeTab === 'summary' && <SummaryComponent checklists={checklists} onTabChange={handleTabChange} />}
                {activeTab === 'links' && <LinksComponent links={usefulLinks} />}
                {activeTab === 'guide' && <GuideComponent />}
                {activeChecklist && (
                    <ChecklistComponent
                        key={activeChecklist.id}
                        checklist={activeChecklist}
                        onChecklistChange={handleChecklistChange}
                        stickyTopOffset={stickyTopOffset}
                    />
                )}
            </main>
      
            {scrollToTopVisible && (
                <button
                    onClick={scrollToTop}
                    className="fixed bottom-6 right-6 bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 z-40"
                    aria-label="Retourner en haut"
                >
                    <FaArrowUp size={24} />
                </button>
            )}
        </div>
    );
};

export default App;