// Fix: Corrected the React import to properly destructure hooks.
import React, { useState, useCallback, useEffect, useRef, useMemo, forwardRef } from 'react';
import type { Checklist, ChecklistItem, ChecklistSection, Aircraft } from './types';
import { INITIAL_CHECKLISTS } from './constants';
import { FaRotateLeft, FaRotateRight, FaCopy, FaTrash, FaXmark, FaGripVertical, FaPencil, FaChevronDown, FaChevronUp, FaCheckDouble, FaSquareXmark, FaArrowUp, FaGear } from 'react-icons/fa6';

// --- ID Generation Utility ---
const idCounter = {
  _count: Date.now(),
  next: function() {
    this._count += 1;
    return `id-${this._count}`;
  }
};

interface UsefulLink {
  id: string;
  title: string;
  url: string;
}

type StartupPreference = 'summary' | 'last_viewed';

// --- Backup System Types ---
interface AppState {
    checklists: Checklist[];
    usefulLinks: UsefulLink[];
    startupPreference: StartupPreference;
}

interface Backup {
    id: string;
    name: string;
    timestamp: number;
    data: AppState;
}


const deepCopyWithNewIds = (sections: ChecklistSection[]): ChecklistSection[] => {
  return sections.map(section => ({
    ...section,
    id: idCounter.next(),
    items: section.items.map(item => ({
      ...item,
      id: idCounter.next(),
    })),
  }));
};

const deepCopySectionWithNewIds = (section: ChecklistSection): ChecklistSection => {
  return {
    ...section,
    id: idCounter.next(),
    items: section.items.map(item => ({
      ...item,
      id: idCounter.next(),
    })),
  };
};


// --- MODAL COMPONENT ---
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        modalRef.current?.focus();
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50" 
            aria-modal="true" 
            role="dialog"
            onClick={onClose}
        >
            <div 
                ref={modalRef}
                className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md border border-gray-700"
                onClick={(e) => e.stopPropagation()}
                tabIndex={-1}
            >
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Fermer la modale">
                        <FaXmark size={20} />
                    </button>
                </div>
                <div>{children}</div>
            </div>
        </div>
    );
};


// --- HELPER COMPONENTS (defined outside main App to prevent re-creation on re-renders) ---

interface HeaderProps {
  isEditMode: boolean;
  onToggleEditMode: () => void;
  canUndo: boolean;
  onUndo: () => void;
  canRedo: boolean;
  onRedo: () => void;
  onOpenSettings: () => void;
}

const Header = forwardRef<HTMLElement, HeaderProps>(({ isEditMode, onToggleEditMode, canUndo, onUndo, canRedo, onRedo, onOpenSettings }, ref) => {
  return (
    <header ref={ref} className="bg-gray-800 shadow-lg p-2 sm:p-4 flex justify-between items-center sticky top-0 z-30">
      <h1 className="text-lg sm:text-2xl font-bold text-white tracking-wider">Aéroclub du Poitou</h1>
      <div className="flex items-center space-x-2 sm:space-x-4">
        {isEditMode && (
          <>
            <button
              onClick={onOpenSettings}
              className="relative group text-white text-xl px-3 py-2 rounded-md hover:bg-gray-700 transition-colors"
              aria-label="Paramètres"
            >
              <FaGear />
              <span className="absolute top-full right-0 mt-2 w-max px-2 py-1 bg-gray-600 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Paramètres
              </span>
            </button>
            <button 
              onClick={onUndo} 
              disabled={!canUndo}
              className="relative group text-white text-xl px-3 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Annuler la dernière modification"
            >
              <FaRotateLeft />
              <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-max px-2 py-1 bg-gray-600 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Annuler
              </span>
            </button>
            <button 
              onClick={onRedo} 
              disabled={!canRedo}
              className="relative group text-white text-xl px-3 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Restaurer la dernière modification"
            >
              <FaRotateRight />
              <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-max px-2 py-1 bg-gray-600 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Restaurer
              </span>
            </button>
          </>
        )}
        <span className={`font-semibold hidden sm:inline ${!isEditMode ? 'text-green-400' : 'text-gray-500'}`}>En vol</span>
        <div className="flex flex-col items-center">
            <div className="sm:hidden flex justify-between w-28 text-xs px-1 mb-1">
                <span className={`font-semibold ${!isEditMode ? 'text-green-400' : 'text-gray-500'}`}>En vol</span>
                <span className={`font-semibold ${isEditMode ? 'text-orange-400' : 'text-gray-500'}`}>Au sol (éditeur)</span>
            </div>
            <button
              onClick={onToggleEditMode}
              role="switch"
              aria-checked={isEditMode}
              aria-label={isEditMode ? "Passer en mode En Vol" : "Passer en mode Au Sol (éditeur)"}
              className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 ${
                isEditMode ? 'bg-orange-500' : 'bg-green-500'
              }`}
            >
              <span
                className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-300 ${
                  isEditMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
        </div>
        <span className={`font-semibold hidden sm:inline ${isEditMode ? 'text-orange-400' : 'text-gray-500'}`}>Au sol (éditeur)</span>
      </div>
    </header>
  );
});

interface TabsComponentProps {
  checklists: Checklist[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const TabsComponent: React.FC<TabsComponentProps> = ({ checklists, activeTab, onTabChange }) => {
  const mainTabs = [
    { id: 'summary', title: 'Sommaire' },
    { id: 'links', title: 'LIENS' },
    { id: 'guide', title: "MODE D'EMPLOI" },
  ];
  const checklistTabs = checklists;

  const renderTab = (tab: { id: string; title: string }) => {
    const isActive = activeTab === tab.id;
    let specialBgClass = '';

    if (isActive) {
        if (tab.title.includes('C150')) { // "C150 / C152"
            specialBgClass = 'bg-gradient-to-r from-orange-500/30 via-green-500/10 to-green-500/30';
        } else if (tab.title.includes('DR400')) {
            specialBgClass = 'bg-gradient-to-r from-blue-900/40 via-red-900/20 to-red-900/40';
        } else if (tab.title.includes('EVEKTOR')) {
            specialBgClass = 'bg-gradient-to-r from-yellow-500/30 via-orange-400/10 to-orange-400/30';
        }
    }

    const tabClasses = [
      'relative group py-2 px-3 sm:px-4 text-sm sm:text-base font-medium transition-colors duration-200 uppercase tracking-wider flex-shrink-0 rounded-t-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
      isActive
        ? 'text-blue-400'
        : 'text-gray-400 hover:text-white',
       specialBgClass
    ]
      .filter(Boolean)
      .join(' ');
    return (
      <button key={tab.id} onClick={() => onTabChange(tab.id)} className={tabClasses}>
        {tab.title}
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
      <div className="flex items-center">
        {renderTab(mainTabs[0])}
        <div className="border-l border-gray-600 h-6 mx-2"></div>
        {renderTab(mainTabs[1])}
        <div className="border-l border-gray-600 h-6 mx-2"></div>
        {renderTab(mainTabs[2])}
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
  onDeleteChecklist: (checklistId: string) => void;
  onAddChecklist: (title: string) => boolean;
  onDuplicateChecklist: (checklistId: string) => void;
  onRenameChecklist: (checklistId: string) => void;
  isEditMode: boolean;
}

const SummaryComponent: React.FC<SummaryComponentProps> = ({ checklists, onTabChange, onDeleteChecklist, onAddChecklist, onDuplicateChecklist, onRenameChecklist, isEditMode }) => {
    const [newChecklistTitle, setNewChecklistTitle] = useState('');
    const [filter, setFilter] = useState('');

    const handleAdd = () => {
        if(onAddChecklist(newChecklistTitle)) {
            setNewChecklistTitle('');
        }
    }

    const filteredChecklists = checklists.filter(checklist =>
        checklist.title.toLowerCase().includes(filter.toLowerCase())
    );

    return (
      <div className="p-4 sm:p-8 bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-white mb-6 uppercase tracking-wider">Sommaire des Checklists</h2>
        
        <div className="mb-6 relative">
            <input
                type="text"
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="w-full p-3 pr-10 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Filtrer par nom..."
                aria-label="Filtrer les checklists par nom"
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
        
        <ul className="space-y-3">
          {filteredChecklists.length > 0 ? (
            filteredChecklists.map(checklist => (
              <li key={checklist.id} className="flex justify-between items-center group">
                <button
                  onClick={() => onTabChange(checklist.id)}
                  className="text-lg text-blue-400 hover:underline text-left"
                >
                  {checklist.title}
                </button>
                 {isEditMode && (
                      <div className="flex items-center space-x-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => onRenameChecklist(checklist.id)} className="text-yellow-400 hover:text-yellow-300" title="Renommer">
                              <FaPencil />
                          </button>
                          <button onClick={() => onDuplicateChecklist(checklist.id)} className="text-blue-400 hover:text-blue-300" title="Dupliquer">
                              <FaCopy />
                          </button>
                          <button onClick={() => onDeleteChecklist(checklist.id)} className="text-red-500 hover:text-red-400" title="Supprimer">
                              <FaTrash />
                          </button>
                      </div>
                  )}
              </li>
            ))
           ) : (
            <li>
              <p className="text-gray-400 italic">Aucune checklist ne correspond à votre recherche.</p>
            </li>
           )}
        </ul>

        <hr className="my-4 border-gray-700" />

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
        {isEditMode && (
            <div className="mt-8 pt-6 border-t border-gray-700">
                <h3 className="text-xl font-bold text-white mb-3">Ajouter une nouvelle checklist</h3>
                <div className="flex flex-col sm:flex-row gap-2">
                    <input
                        type="text"
                        value={newChecklistTitle}
                        onChange={e => setNewChecklistTitle(e.target.value)}
                        onKeyDown={e => {if (e.key === 'Enter') handleAdd()}}
                        className="flex-grow p-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Nom de la nouvelle checklist"
                    />
                    <button onClick={handleAdd} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">Ajouter</button>
                </div>
            </div>
        )}
      </div>
    );
};

interface LinksComponentProps {
    links: UsefulLink[];
    isEditMode: boolean;
    onAddLink: (title: string, url: string) => void;
    onUpdateLink: (id: string, newTitle: string, newUrl: string) => void;
    onDeleteLink: (id: string) => void;
}

const LinksComponent: React.FC<LinksComponentProps> = ({ links, isEditMode, onAddLink, onUpdateLink, onDeleteLink }) => {
    const [newTitle, setNewTitle] = useState('');
    const [newUrl, setNewUrl] = useState('');

    const handleAdd = () => {
        if (newTitle.trim() && newUrl.trim()) {
            onAddLink(newTitle, newUrl);
            setNewTitle('');
            setNewUrl('');
        }
    };

    return (
        <div className="p-4 sm:p-8 bg-gray-800 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold text-white mb-6 uppercase tracking-wider">Liens utiles</h2>
            <ul className="space-y-4">
                {links.map(link => (
                    <li key={link.id} className="group">
                        {isEditMode ? (
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={link.title}
                                    onChange={(e) => onUpdateLink(link.id, e.target.value, link.url)}
                                    className="flex-1 p-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Titre du lien"
                                />
                                <input
                                    type="text"
                                    value={link.url}
                                    onChange={(e) => onUpdateLink(link.id, link.title, e.target.value)}
                                    className="flex-1 p-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="URL (https://...)"
                                />
                                <button onClick={() => onDeleteLink(link.id)} className="text-red-500 hover:text-red-400 p-2">
                                    <FaTrash />
                                </button>
                            </div>
                        ) : (
                            <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xl text-blue-400 hover:underline"
                            >
                                {link.title}
                            </a>
                        )}
                    </li>
                ))}
            </ul>

            {isEditMode && (
                <div className="mt-8 pt-6 border-t border-gray-700">
                    <h3 className="text-xl font-bold text-white mb-3">Ajouter un nouveau lien</h3>
                    <div className="flex flex-col gap-2">
                        <input
                            type="text"
                            value={newTitle}
                            onChange={e => setNewTitle(e.target.value)}
                            className="p-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Titre du lien"
                        />
                        <input
                            type="text"
                            value={newUrl}
                            onChange={e => setNewUrl(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAdd()}
                            className="p-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="URL du lien (ex: https://www.example.com)"
                        />
                        <button onClick={handleAdd} className="self-start px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
                            Ajouter le lien
                        </button>
                    </div>
                </div>
            )}

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
                <p>Dernière mise à jour : 27 août 2025</p>
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
            
            <SectionTitle>Mode "En Vol" (Utilisation normale)</SectionTitle>
            <p>Ce mode, identifié par la couleur verte, est conçu pour l'utilisation en vol. Il est activé par défaut.</p>
            
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
                <ListItem><strong>Notes Personnelles :</strong> Une zone de texte sous la liste des avions vous permet de prendre des notes spécifiques à la checklist. Ces notes sont sauvegardées automatiquement et restent disponibles pour vos prochains vols.</ListItem>
                <ListItem><strong>Gestion des sections :</strong> Appuyez sur le titre d'une section pour la replier ou la déplier. Une section se replie automatiquement lorsque tous ses items sont cochés.</ListItem>
            </ul>

            <SubSectionTitle>Boutons d'Action Rapide</SubSectionTitle>
            <p>En haut de chaque checklist, deux boutons couvrant toute la largeur vous aident à gérer l'affichage :</p>
            <ul>
                <ListItem><strong>Replier / Déplier toutes les sections :</strong> Ce bouton change de fonction. Par défaut, il permet de replier toutes les sections. Une fois activé, il se transforme pour tout déplier d'un coup.</ListItem>
                <ListItem><strong>Réinitialiser (tout décocher) :</strong> Ce bouton décoche tous les items, vous préparant pour une nouvelle utilisation. Il respecte les sections que vous avez configurées pour être cochées par défaut (voir mode "Au Sol").</ListItem>
            </ul>

            <SectionTitle>Mode "Au Sol" (Éditeur)</SectionTitle>
            <p className="text-orange-300 font-bold">⚠️ ATTENTION : Ce mode est destiné à la personnalisation au sol uniquement. Ne jamais l'utiliser en vol !</p>
            <p>Activez ce mode via le bouton à bascule en haut à droite. L'interface passera en orange pour bien le différencier.</p>
            <SubSectionTitle>Gestion des checklists (depuis le Sommaire)</SubSectionTitle>
            <ul>
                <ListItem><strong>Ajouter :</strong> Utilisez le formulaire en bas de la page Sommaire.</ListItem>
                <ListItem><strong>Renommer, Dupliquer, Supprimer :</strong> Ces options apparaissent à droite du nom de la checklist lorsque vous passez la souris dessus.</ListItem>
            </ul>
            <SubSectionTitle>Édition d'une checklist</SubSectionTitle>
            <p>Une fois dans une checklist en mode éditeur :</p>
            <ul>
                <ListItem><strong>Réorganiser :</strong> Maintenez le clic sur l'icône <FaGripVertical className="inline-block" /> et déplacez les sections ou les lignes pour les réordonner.</ListItem>
                <ListItem><strong>Modifier :</strong> Cliquez directement sur le texte d'un titre, d'un libellé ou d'une action pour le modifier.</ListItem>
                <ListItem><strong>Ajouter/Supprimer :</strong> Des boutons apparaissent pour ajouter ou supprimer des sections et des lignes.</ListItem>
                <ListItem><strong>Item critique (🚨) :</strong> Cliquez sur l'icône d'alerte pour marquer un item comme critique (il apparaîtra en rouge en mode vol).</ListItem>
                <ListItem><strong>Copier/Coller une section :</strong> Utilisez les icônes de copie sur une section, puis collez-la où vous le souhaitez via les zones "+ Ajouter une Section".</ListItem>
                <ListItem><strong>Pré-cocher une section (✅) :</strong> Cochez cette case à côté des boutons d'une section. En mode "En Vol", cette section apparaîtra alors comme entièrement cochée et repliée par défaut. C'est très utile pour des sections comme "URGENCES" ou "PARAMÈTRES", que l'on consulte plus qu'on ne les exécute pas à pas.</ListItem>
            </ul>

            <SectionTitle>Paramètres (via l'icône <FaGear className="inline-block" /> en mode éditeur)</SectionTitle>
            <SubSectionTitle>Affichage à l'ouverture</SubSectionTitle>
            <p>Choisissez si l'application doit s'ouvrir sur le sommaire ou sur le dernier onglet que vous avez consulté.</p>
            <SubSectionTitle>Sauvegardes</SubSectionTitle>
            <p>Une fonction essentielle pour la sécurité de vos données.</p>
            <ul>
                <ListItem><strong>Créer :</strong> Enregistre l'état complet de l'application (checklists, liens, paramètres) dans une sauvegarde nommée.</ListItem>
                <ListItem><strong>Restaurer :</strong> Remplace la configuration actuelle par celle d'une sauvegarde choisie. Attention, les modifications non sauvegardées seront perdues.</ListItem>
                <ListItem><strong>Supprimer :</strong> Efface une sauvegarde devenue inutile.</ListItem>
            </ul>
            <SubSectionTitle>Réinitialisation</SubSectionTitle>
            <p>Remet l'application à son état d'origine. <strong className="text-red-400">Toutes vos personnalisations seront définitivement perdues.</strong> Utilisez cette fonction avec une extrême prudence.</p>

            <SectionTitle>Contact</SectionTitle>
            <p>Pour toute question, suggestion ou si vous constatez un bug, n'hésitez pas à envoyer un mail à <a href="mailto:aeroclubdupoitou86@gmail.com" className="text-blue-400 hover:underline">aeroclubdupoitou86@gmail.com</a>.</p>
        </div>
    );
};


interface ActionZoneProps {
    isEditMode: boolean;
    copiedSection: ChecklistSection | null;
    onAdd: () => void;
    onPaste: () => void;
    onDrop: () => void;
}

const ActionZone: React.FC<ActionZoneProps> = ({ isEditMode, copiedSection, onAdd, onPaste, onDrop }) => {
    if (!isEditMode) return null;
    const [isDragOver, setIsDragOver] = useState(false);

    return (
        <div 
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragOver(false); onDrop(); }}
            className={`my-2 h-10 flex items-center justify-center border-2 border-dashed rounded-lg transition-all ${isDragOver ? 'border-blue-500 bg-blue-900 bg-opacity-30' : 'border-gray-700 hover:border-blue-700'}`}
        >
            {copiedSection ? (
                <button onClick={onPaste} className="w-full h-full text-blue-400 hover:text-blue-300">
                    Coller la section "{copiedSection.title}"
                </button>
            ) : (
                <button onClick={onAdd} className="w-full h-full text-gray-400 hover:text-blue-300">
                    + Ajouter une Section
                </button>
            )}
        </div>
    );
};

interface ChecklistComponentProps {
    checklist: Checklist;
    onChecklistChange: (updatedChecklist: Checklist) => void;
    isEditMode: boolean;
    copiedSection: ChecklistSection | null;
    onCopySection: (section: ChecklistSection) => void;
    onPasteSection: (targetChecklistId: string, targetIndex: number) => void;
}

const ChecklistComponent: React.FC<ChecklistComponentProps> = ({ checklist, onChecklistChange, isEditMode, copiedSection, onCopySection, onPasteSection }) => {
    const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
    const [warningItemIds, setWarningItemIds] = useState<Set<string>>(new Set());
    const [draggedItem, setDraggedItem] = useState<{sectionId: string; itemId: string} | null>(null);
    const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
    const [newAircraftInput, setNewAircraftInput] = useState('');
    const [newAircraftUrlInput, setNewAircraftUrlInput] = useState('');
    const [sectionToDeleteId, setSectionToDeleteId] = useState<string | null>(null);
    const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
    const [filterText, setFilterText] = useState<string>('');
    const [localNotes, setLocalNotes] = useState(checklist.notes || '');
    const itemRefs = useRef<Record<string, HTMLLIElement | null>>({});
    const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const shouldScrollAfterCheck = useRef(false);
    const wasInEditMode = useRef(isEditMode);

    // Sync local notes with props
    useEffect(() => {
        setLocalNotes(checklist.notes || '');
    }, [checklist.notes]);

    // Debounced save for notes
    useEffect(() => {
        const handler = setTimeout(() => {
            if (localNotes !== (checklist.notes || '')) {
                onChecklistChange({ ...checklist, notes: localNotes });
            }
        }, 500); // 500ms debounce delay

        return () => {
            clearTimeout(handler);
        };
    }, [localNotes, checklist, onChecklistChange]);


    const handleResetChecks = useCallback(() => {
        const updatedSections = checklist.sections.map(section => ({
            ...section,
            items: section.items.map(item => ({ ...item, checked: !!section.defaultChecked }))
        }));
        onChecklistChange({ ...checklist, sections: updatedSections });
        setHighlightedItemId(null);
    }, [checklist, onChecklistChange]);

    useEffect(() => {
        // Automatically reset checks when switching from Edit Mode to Flight Mode
        if (wasInEditMode.current && !isEditMode) {
            handleResetChecks();
        }
        wasInEditMode.current = isEditMode;
    }, [isEditMode, handleResetChecks]);


    const filteredSections = useMemo(() => {
        if (isEditMode || !filterText.trim()) {
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
    }, [checklist.sections, filterText, isEditMode]);

    const scrollToElement = useCallback((element: HTMLElement) => {
        if (!element) return;
        const header = document.querySelector<HTMLElement>('header');
        const warningBanner = document.querySelector<HTMLElement>('.bg-red-900.sticky');
        const editModeBanner = document.querySelector<HTMLElement>('.bg-orange-900.sticky');
        const headerHeight = header ? header.offsetHeight : 0;
        const bannerHeight = (warningBanner?.offsetHeight ?? 0) + (editModeBanner?.offsetHeight ?? 0);
        const topOffset = headerHeight + bannerHeight;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.scrollY - topOffset - 16;
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }, []);

    useEffect(() => {
        // Gérer les avertissements (rouge) et le surlignage du prochain item (bleu)
        if (isEditMode) {
            setWarningItemIds(new Set());
            setHighlightedItemId(null); // Clear highlight in edit mode
            return;
        }

        const allFlatItems = checklist.sections.flatMap(s => s.items);

        // --- Calcul des avertissements (items rouges) ---
        const newWarningIds = new Set<string>();
        let lastCheckedIndex = -1;
        // Trouve le dernier item coché
        for (let i = allFlatItems.length - 1; i >= 0; i--) {
            if (allFlatItems[i].checked) {
                lastCheckedIndex = i;
                break;
            }
        }

        // Si au moins un item est coché, vérifie tous les items précédents
        if (lastCheckedIndex > 0) {
            for (let i = 0; i < lastCheckedIndex; i++) {
                if (!allFlatItems[i].checked) {
                    newWarningIds.add(allFlatItems[i].id);
                }
            }
        }
        setWarningItemIds(newWarningIds);

        // --- Calcul du surlignage (item bleu) ---
        // Trouve le premier item non coché
        const firstUncheckedItem = allFlatItems.find(item => !item.checked);
        
        // Surligne-le seulement si ce n'est pas un avertissement
        if (firstUncheckedItem && !newWarningIds.has(firstUncheckedItem.id)) {
            setHighlightedItemId(firstUncheckedItem.id);
        } else {
            // Annule le surlignage si le prochain item est un avertissement ou s'il n'y en a plus
            setHighlightedItemId(null);
        }

    }, [checklist.sections, isEditMode]);

    useEffect(() => {
        if (shouldScrollAfterCheck.current) {
            shouldScrollAfterCheck.current = false; // Reset trigger
            if (!isEditMode && highlightedItemId) {
                const element = itemRefs.current[highlightedItemId];
                if (element) {
                    setTimeout(() => scrollToElement(element), 50);
                }
            }
        }
    }, [highlightedItemId, isEditMode, scrollToElement]);

    // Automatically expand a section if the next item to check is inside it
    useEffect(() => {
        if (!isEditMode && highlightedItemId) {
            const sectionContainingHighlight = checklist.sections.find(section => 
                section.items.some(item => item.id === highlightedItemId)
            );
            if (sectionContainingHighlight && collapsedSections.has(sectionContainingHighlight.id)) {
                setCollapsedSections(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(sectionContainingHighlight.id);
                    return newSet;
                });
            }
        }
    }, [highlightedItemId, checklist.sections, collapsedSections, isEditMode]);


    useEffect(() => {
        if (isEditMode) {
            setCollapsedSections(new Set());
            return;
        }
        const newCollapsed = new Set<string>();
        checklist.sections.forEach(section => {
            if (section.items.length > 0 && section.items.every(item => item.checked)) {
                newCollapsed.add(section.id);
            }
        });
        setCollapsedSections(newCollapsed);
    }, [checklist.sections, isEditMode]);


    const handleCheck = (sectionId: string, itemId: string) => {
        let isChecking = false;
        let targetSectionIsNowComplete = false;

        const updatedSections = checklist.sections.map(section => {
            if (section.id === sectionId) {
                const updatedItems = section.items.map(item => {
                    if (item.id === itemId) {
                        isChecking = !item.checked;
                        return { ...item, checked: !item.checked };
                    }
                    return item;
                });
                targetSectionIsNowComplete = isChecking && updatedItems.every(item => item.checked);
                return { ...section, items: updatedItems };
            }
            return section;
        });
        
        shouldScrollAfterCheck.current = true;
        onChecklistChange({ ...checklist, sections: updatedSections });

        const newCollapsedSections = new Set(collapsedSections);
        if (targetSectionIsNowComplete) {
            newCollapsedSections.add(sectionId);
        } else if (!isChecking && newCollapsedSections.has(sectionId)) {
            const section = updatedSections.find(s => s.id === sectionId);
            if (section && !section.items.every(i => i.checked)) {
                 newCollapsedSections.delete(sectionId);
            }
        }
        setCollapsedSections(newCollapsedSections);
    };
    
    const handleCheckAllInSection = (sectionId: string) => {
        const updatedSections = checklist.sections.map(section => {
            if (section.id === sectionId) {
                return { ...section, items: section.items.map(item => ({ ...item, checked: true })) };
            }
            return section;
        });

        onChecklistChange({ ...checklist, sections: updatedSections });

        setCollapsedSections(prev => new Set(prev).add(sectionId));
    };

    const handleUncheckAllInSection = (sectionId: string) => {
        const updatedSections = checklist.sections.map(section => {
            if (section.id === sectionId) {
                return { ...section, items: section.items.map(item => ({...item, checked: false }))};
            }
            return section;
        });
        onChecklistChange({...checklist, sections: updatedSections});
        setCollapsedSections(prev => {
            const newSet = new Set(prev);
            newSet.delete(sectionId);
            return newSet;
        });
        setHighlightedItemId(null);
    };

    const handleToggleSection = (sectionId: string) => {
        const newCollapsed = new Set(collapsedSections);
        const isCurrentlyCollapsed = newCollapsed.has(sectionId);

        if (isCurrentlyCollapsed) {
            newCollapsed.delete(sectionId);
        } else {
            newCollapsed.add(sectionId);
            const sectionIndex = checklist.sections.findIndex(s => s.id === sectionId);
            const nextSection = checklist.sections[sectionIndex + 1];
            if (nextSection) {
                const nextSectionElement = sectionRefs.current[nextSection.id];
                if (nextSectionElement) {
                    setTimeout(() => scrollToElement(nextSectionElement), 50);
                }
            }
        }
        setCollapsedSections(newCollapsed);
    };
    
    const handleExpandAll = () => {
        setCollapsedSections(new Set());
    };

    const handleCollapseAll = () => {
        const allSectionIds = new Set(checklist.sections.map(s => s.id));
        setCollapsedSections(allSectionIds);
    };

    const handleAddAircraft = () => {
        const newAircraftName = newAircraftInput.trim().toUpperCase();
        const newAircraftUrl = newAircraftUrlInput.trim();
        if (newAircraftName && !checklist.aircrafts.some(a => a.name === newAircraftName)) {
            const newAircraft: Aircraft = {
                id: idCounter.next(),
                name: newAircraftName,
                url: newAircraftUrl || undefined,
            };
            const updatedAircrafts = [...checklist.aircrafts, newAircraft];
            onChecklistChange({ ...checklist, aircrafts: updatedAircrafts });
            setNewAircraftInput('');
            setNewAircraftUrlInput('');
        }
    };
    
    const handleRemoveAircraft = (aircraftIdToRemove: string) => {
        const updatedAircrafts = checklist.aircrafts.filter(a => a.id !== aircraftIdToRemove);
        onChecklistChange({ ...checklist, aircrafts: updatedAircrafts });
    };

    const handleUpdateAircraft = (aircraftId: string, field: 'name' | 'url', value: string) => {
        const updatedAircrafts = checklist.aircrafts.map(craft => {
            if (craft.id === aircraftId) {
                return { ...craft, [field]: value };
            }
            return craft;
        });
        onChecklistChange({ ...checklist, aircrafts: updatedAircrafts });
    };

    const handleAddItem = (sectionId: string) => {
        const newItem: ChecklistItem = {id: idCounter.next(), label: 'Nouvel item', action: 'Action', checked: false};
        const updatedSections = checklist.sections.map(section => {
            if(section.id === sectionId) {
                return {...section, items: [...section.items, newItem]};
            }
            return section;
        });
        onChecklistChange({...checklist, sections: updatedSections});
    }

    const handleDeleteItem = (sectionId: string, itemId: string) => {
        const updatedSections = checklist.sections.map(section => {
            if(section.id === sectionId) {
                return {...section, items: section.items.filter(item => item.id !== itemId)};
            }
            return section;
        });
        onChecklistChange({...checklist, sections: updatedSections});
    }

    const handleToggleCriticalItem = (sectionId: string, itemId: string) => {
        const updatedSections = checklist.sections.map(section => {
            if (section.id === sectionId) {
                return {
                    ...section,
                    items: section.items.map(item => {
                        if (item.id === itemId) {
                            return { ...item, isCritical: !item.isCritical };
                        }
                        return item;
                    }),
                };
            }
            return section;
        });
        onChecklistChange({ ...checklist, sections: updatedSections });
    };

    const handleDragStart = (sectionId: string, itemId: string) => {
      if(!isEditMode) return;
      setDraggedItem({ sectionId, itemId });
    };

    const handleDrop = (targetSectionId: string, targetItemId: string) => {
        if (!draggedItem || !isEditMode) return;
        
        const { sectionId: fromSectionId, itemId: fromItemId } = draggedItem;
        if (fromItemId === targetItemId) {
            setDraggedItem(null);
            return;
        }

        let fromItem: ChecklistItem | undefined;
        const tempSections = JSON.parse(JSON.stringify(checklist.sections));

        const fromSection = tempSections.find((s: ChecklistSection) => s.id === fromSectionId);
        if (fromSection) {
            const itemIndex = fromSection.items.findIndex((i: ChecklistItem) => i.id === fromItemId);
            if(itemIndex > -1) {
                [fromItem] = fromSection.items.splice(itemIndex, 1);
            }
        }

        if (!fromItem) { setDraggedItem(null); return; }

        const toSection = tempSections.find((s: ChecklistSection) => s.id === targetSectionId);
        if (toSection) {
            const toIndex = toSection.items.findIndex((i: ChecklistItem) => i.id === targetItemId);
            if(toIndex > -1) {
                toSection.items.splice(toIndex, 0, fromItem);
            } else { // Fallback if drop target is section but not specific item
                 toSection.items.push(fromItem);
            }
        }
        
        onChecklistChange({...checklist, sections: tempSections});
        setDraggedItem(null);
    };

    const handleItemContentChange = (sectionId: string, itemId: string, field: 'label' | 'action', value: string) => {
      const updatedSections = checklist.sections.map(section => {
          if (section.id === sectionId) {
              return {
                  ...section,
                  items: section.items.map(item => {
                      if (item.id === itemId) {
                          return { ...item, [field]: value };
                      }
                      return item;
                  }),
              };
          }
          return section;
      });
      onChecklistChange({ ...checklist, sections: updatedSections });
    };

    // --- Section Management ---

    const handleAddSection = (index: number) => {
        const newSection: ChecklistSection = { id: idCounter.next(), title: 'Nouvelle Section', items: [] };
        const newSections = [...checklist.sections];
        newSections.splice(index, 0, newSection);
        onChecklistChange({ ...checklist, sections: newSections });
    };
    
    const handleDeleteSection = (sectionId: string) => {
        setSectionToDeleteId(sectionId);
    };

    const confirmDeleteSection = () => {
        if (!sectionToDeleteId) return;
        const updatedSections = checklist.sections.filter(s => s.id !== sectionToDeleteId);
        onChecklistChange({ ...checklist, sections: updatedSections });
        setSectionToDeleteId(null);
    };
    
    const handleSectionTitleChange = (sectionId: string, newTitle: string) => {
        const updatedSections = checklist.sections.map(s => s.id === sectionId ? { ...s, title: newTitle } : s);
        onChecklistChange({ ...checklist, sections: updatedSections });
    };

    const handleToggleSectionDefaultCheck = (sectionId: string) => {
        const updatedSections = checklist.sections.map(section => {
            if (section.id === sectionId) {
                return { ...section, defaultChecked: !section.defaultChecked };
            }
            return section;
        });
        onChecklistChange({ ...checklist, sections: updatedSections });
    };

    const handleSectionDragStart = (sectionId: string) => {
        if (!isEditMode) return;
        setDraggedSectionId(sectionId);
    };

    const handleSectionDrop = (targetIndex: number) => {
        if (!draggedSectionId || !isEditMode) {
            setDraggedSectionId(null);
            return;
        }

        const sections = [...checklist.sections];
        const draggedIndex = sections.findIndex(s => s.id === draggedSectionId);
        
        if (draggedIndex === -1) {
            setDraggedSectionId(null);
            return;
        }

        const [reorderedItem] = sections.splice(draggedIndex, 1);
        
        const newTargetIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;

        sections.splice(newTargetIndex, 0, reorderedItem);

        onChecklistChange({ ...checklist, sections });
        setDraggedSectionId(null);
    };

    const handleSectionLinkClick = (sectionId: string) => {
        // Ensure the section is expanded before scrolling
        setCollapsedSections(prev => {
            const newSet = new Set(prev);
            newSet.delete(sectionId);
            return newSet;
        });
        
        // Use a timeout to allow the DOM to update before scrolling
        setTimeout(() => {
            const sectionElement = sectionRefs.current[sectionId];
            if (sectionElement) {
                scrollToElement(sectionElement);
            }
        }, 50);
    };

    const allSectionsCollapsed = collapsedSections.size > 0 && collapsedSections.size === checklist.sections.length;

    return (
        <div className="p-4 md:p-8">
            <Modal
                isOpen={!!sectionToDeleteId}
                onClose={() => setSectionToDeleteId(null)}
                title="Confirmer la suppression"
            >
                <p className="text-gray-300">Êtes-vous sûr de vouloir supprimer cette section et tous ses items ?</p>
                <div className="flex justify-end gap-4 mt-6">
                    <button onClick={() => setSectionToDeleteId(null)} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">Annuler</button>
                    <button onClick={confirmDeleteSection} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">Supprimer</button>
                </div>
            </Modal>
            
            {isEditMode && (
                <div className="mb-6">
                    <label htmlFor="checklist-title-input" className="sr-only">Titre de la checklist</label>
                    <input
                        id="checklist-title-input"
                        type="text"
                        value={checklist.title}
                        onChange={(e) => onChecklistChange({ ...checklist, title: e.target.value })}
                        className="w-full text-3xl font-bold p-2 bg-gray-700 border border-gray-600 rounded text-white tracking-wider"
                    />
                </div>
            )}

            {isEditMode && (
                 <div className="sticky top-[var(--header-height)] z-20 mb-6 text-center p-3 bg-orange-900 bg-opacity-80 backdrop-blur-sm border border-orange-600 rounded-lg">
                    <h2 className="text-xl text-orange-300 font-bold">MODE EDITEUR ! Ne pas voler avec ce mode ⚠️</h2>
                 </div>
            )}
            
            <div className="bg-gray-800 p-4 rounded-lg shadow-lg mb-6">
                <div className="font-bold text-gray-400 uppercase tracking-wider mb-2">Avions concernés:</div>
                {isEditMode ? (
                    <div className="space-y-2">
                        {checklist.aircrafts.map(craft => (
                            <div key={craft.id} className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={craft.name}
                                    onChange={(e) => handleUpdateAircraft(craft.id, 'name', e.target.value)}
                                    className="w-32 p-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="F-GXXX"
                                />
                                <input
                                    type="text"
                                    value={craft.url || ''}
                                    onChange={(e) => handleUpdateAircraft(craft.id, 'url', e.target.value)}
                                    className="flex-grow p-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="URL (optionnel)"
                                />
                                <button onClick={() => handleRemoveAircraft(craft.id)} className="text-red-500 hover:text-red-400 p-2 text-lg">
                                    <FaTrash />
                                </button>
                            </div>
                        ))}
                         <div className="flex flex-col sm:flex-row mt-3 gap-2 pt-3 border-t border-gray-700">
                            <input 
                                type="text"
                                value={newAircraftInput}
                                onChange={e => setNewAircraftInput(e.target.value)}
                                onKeyDown={e => {if (e.key === 'Enter') handleAddAircraft()}}
                                className="sm:w-32 p-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Ajouter un avion"
                            />
                             <input 
                                type="text"
                                value={newAircraftUrlInput}
                                onChange={e => setNewAircraftUrlInput(e.target.value)}
                                onKeyDown={e => {if (e.key === 'Enter') handleAddAircraft()}}
                                className="flex-grow p-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="URL du lien (optionnel)"
                            />
                            <button onClick={handleAddAircraft} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">Ajouter</button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-wrap items-center gap-2">
                        {checklist.aircrafts.map(craft => craft.url ? (
                            <a 
                                key={craft.id} 
                                href={craft.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="bg-blue-900 text-blue-200 text-lg px-3 py-1 rounded-full flex items-center hover:bg-blue-800 transition-colors"
                            >
                                <span>{craft.name}</span>
                            </a>
                        ) : (
                            <div key={craft.id} className="bg-blue-900 text-blue-200 text-lg px-3 py-1 rounded-full flex items-center">
                                <span>{craft.name}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="bg-gray-800 p-4 rounded-lg shadow-lg mb-6">
                <label htmlFor={`notes-${checklist.id}`} className="font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                    Notes Personnelles
                </label>
                <textarea
                    id={`notes-${checklist.id}`}
                    value={localNotes}
                    onChange={(e) => setLocalNotes(e.target.value)}
                    className="w-full h-32 p-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                    placeholder="Prenez vos notes ici..."
                    aria-label="Notes personnelles pour cette checklist"
                />
            </div>

            {!isEditMode && (
                <div className="my-6 relative">
                    <input
                        type="text"
                        value={filterText}
                        onChange={e => setFilterText(e.target.value)}
                        className="w-full p-3 pr-10 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Filtrer les items par nom ou action..."
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
            )}
            
            {!isEditMode && (
                 <div className="bg-gray-800 p-4 rounded-lg shadow-lg mb-6">
                    <div className="font-bold text-gray-400 uppercase tracking-wider mb-2">Sommaire de la checklist:</div>
                    <div className="flex flex-wrap gap-2">
                        {filteredSections.map(section => {
                            const isEmergencySection = /urgences/i.test(section.title);
                            const isDistressSection = /detresse & transpondeur/i.test(section.title);
                            
                            let buttonClass = 'bg-gray-700 hover:bg-gray-600 text-blue-300';
                            if (isEmergencySection) {
                                buttonClass = 'bg-red-800 hover:bg-red-700 text-red-200';
                            } else if (isDistressSection) {
                                buttonClass = 'bg-orange-800 hover:bg-orange-700 text-orange-200';
                            }

                            return (
                                <button
                                    key={`summary-${section.id}`}
                                    onClick={() => handleSectionLinkClick(section.id)}
                                    className={`px-3 py-1 rounded-md transition-colors text-sm ${buttonClass}`}
                                >
                                    {section.title}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
            
            {!isEditMode && (
                <div className="flex w-full items-center mb-6 gap-2 sm:gap-4">
                    <button
                        onClick={allSectionsCollapsed ? handleExpandAll : handleCollapseAll}
                        className="flex-1 px-3 sm:px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition text-sm sm:text-base"
                    >
                        {allSectionsCollapsed ? 'Déplier toutes les sections' : 'Replier toutes les sections'}
                    </button>
                     <button 
                        onClick={handleResetChecks} 
                        className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm sm:text-base"
                    >
                        Réinitialiser (tout décocher)
                    </button>
                </div>
            )}

            <div>
                 <ActionZone isEditMode={isEditMode} copiedSection={copiedSection} onAdd={() => handleAddSection(0)} onPaste={() => onPasteSection(checklist.id, 0)} onDrop={() => handleSectionDrop(0)} />
                {filteredSections.length > 0 ? (
                    filteredSections.map((section, index) => {
                        const isEmergencySection = /urgences/i.test(section.title);
                        const isDistressSection = /detresse & transpondeur/i.test(section.title);

                        let headerClass = 'bg-black bg-opacity-20';
                        if (isEmergencySection) {
                            headerClass = 'bg-red-800';
                        } else if (isDistressSection) {
                            headerClass = 'bg-orange-800';
                        }

                        return (
                        <React.Fragment key={section.id}>
                            <div 
                                className="bg-gray-800 rounded-lg shadow-lg overflow-hidden mb-6"
                                draggable={isEditMode}
                                onDragStart={() => handleSectionDragStart(section.id)}
                                ref={el => { sectionRefs.current[section.id] = el; }}
                            >
                                <div className={`text-white text-xl font-bold p-3 flex items-center justify-between ${headerClass}`}>
                                    {isEditMode ? (
                                        <>
                                            <span className="cursor-grab text-gray-500 mr-4"><FaGripVertical /></span>
                                            <input 
                                                type="text"
                                                value={section.title}
                                                onChange={(e) => handleSectionTitleChange(section.id, e.target.value)}
                                                className="w-full p-1 bg-gray-700 border border-gray-600 rounded text-white uppercase tracking-wider"
                                            />
                                            <div className="flex items-center ml-4 space-x-2 sm:space-x-4">
                                                <label className="flex items-center cursor-pointer group" title="Cocher cette section par défaut en mode 'En Vol'">
                                                    <input
                                                        type="checkbox"
                                                        checked={!!section.defaultChecked}
                                                        onChange={() => handleToggleSectionDefaultCheck(section.id)}
                                                        className="w-5 h-5 rounded bg-gray-600 border-gray-500 text-green-500 focus:ring-green-400"
                                                    />
                                                    <FaCheckDouble className="ml-2 text-green-400 opacity-70 group-hover:opacity-100" />
                                                </label>
                                                <button onClick={() => onCopySection(section)} className="text-blue-400 hover:text-blue-300" title="Copier la section">
                                                    <FaCopy />
                                                </button>
                                                <button onClick={() => handleDeleteSection(section.id)} className="text-red-500 hover:text-red-400" title="Supprimer la section">
                                                    <FaTrash />
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex items-center flex-grow">
                                                <button onClick={() => handleToggleSection(section.id)} className="mr-3 p-1 text-gray-400 hover:text-white" aria-label={collapsedSections.has(section.id) ? "Déplier la section" : "Replier la section"}>
                                                    {collapsedSections.has(section.id) ? <FaChevronDown size={16} /> : <FaChevronUp size={16} />}
                                                </button>
                                                <h3 className="uppercase tracking-wider">{section.title}</h3>
                                            </div>
                                            <div className="flex items-center space-x-4">
                                                <button onClick={() => handleCheckAllInSection(section.id)} className="text-gray-400 hover:text-white" title="Tout cocher dans cette section">
                                                    <FaCheckDouble size={20} />
                                                </button>
                                                <button onClick={() => handleUncheckAllInSection(section.id)} className="text-gray-400 hover:text-white" title="Tout décocher dans cette section">
                                                    <FaSquareXmark size={20} />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                                {!collapsedSections.has(section.id) && (
                                <ul>
                                    {section.items.map(item => {
                                        const isHighlighted = highlightedItemId === item.id;
                                        const isWarning = warningItemIds.has(item.id);

                                        const labelColorClass = item.checked ? 'text-gray-500 line-through' : item.isCritical ? 'text-red-400' : isHighlighted ? 'text-sky-300' : 'text-gray-200';
                                        const actionColorClass = item.checked ? 'text-gray-500 line-through' : item.isCritical ? 'text-red-400' : isHighlighted ? 'text-sky-300' : 'text-gray-400';
                                        const fontWeightClass = isHighlighted ? 'font-semibold' : '';
                                        
                                        const liClasses = [
                                            'flex flex-col lg:flex-row lg:items-start p-3 border-b border-gray-700 last:border-b-0 group transition-all duration-300',
                                            isEditMode ? 'cursor-move' : '',
                                            isHighlighted ? 'bg-sky-800' : '',
                                            isWarning ? 'bg-red-900 bg-opacity-60' : '',
                                        ];

                                        if (!isHighlighted && !isWarning) {
                                            if (isEmergencySection) {
                                                liClasses.push('bg-red-900 bg-opacity-30');
                                            } else if (isDistressSection) {
                                                liClasses.push('bg-orange-900 bg-opacity-30');
                                            }
                                        }

                                        return (
                                        <li
                                            key={item.id}
                                            ref={el => { itemRefs.current[item.id] = el; }}
                                            draggable={isEditMode}
                                            onDragStart={() => handleDragStart(section.id, item.id)}
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={() => handleDrop(section.id, item.id)}
                                            className={liClasses.join(' ')}
                                        >
                                            {/* Left Column: Label */}
                                            <div className="flex-1 min-w-0 flex items-center w-full lg:pr-4">
                                                {isEditMode && <span className="text-gray-500 mr-2 lg:mr-4 cursor-grab"><FaGripVertical /></span>}
                                                {isEditMode ? (
                                                    <input type="text" value={item.label} onChange={(e) => handleItemContentChange(section.id, item.id, 'label', e.target.value)} className={`w-full p-1 bg-gray-700 border border-gray-600 rounded text-white text-sm sm:text-base ${item.isCritical ? 'text-red-400' : ''}`} />
                                                ) : (
                                                    <span className={`text-sm sm:text-base ${labelColorClass} ${fontWeightClass} transition-colors`}>
                                                        {item.label}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Right Column: Action & Controls */}
                                            <div className="w-full lg:w-5/12 flex items-center justify-end mt-2 lg:mt-0">
                                                <div className="flex-1 min-w-0">
                                                {isEditMode ? (
                                                    <input type="text" value={item.action} onChange={(e) => handleItemContentChange(section.id, item.id, 'action', e.target.value)} className={`w-full p-1 bg-gray-700 border border-gray-600 rounded text-white text-sm sm:text-base text-right ${item.isCritical ? 'text-red-400' : ''}`} />
                                                ) : (
                                                    <span className={`text-sm sm:text-base font-mono text-right ${actionColorClass} ${fontWeightClass} transition-colors break-words w-full block`}>
                                                        {item.action}
                                                    </span>
                                                )}
                                                </div>

                                                {isEditMode ? (
                                                    <>
                                                        <button onClick={() => handleToggleCriticalItem(section.id, item.id)} className={`ml-3 p-1 rounded-full transition-colors text-xl flex-shrink-0 ${item.isCritical ? 'bg-red-500 text-white' : 'text-gray-500 hover:bg-gray-600'} opacity-0 group-hover:opacity-100`} title="Marquer comme important">
                                                            🚨
                                                        </button>
                                                        <button onClick={() => handleDeleteItem(section.id, item.id)} className="ml-2 text-red-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                                            <FaTrash />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <input
                                                        type="checkbox"
                                                        checked={item.checked}
                                                        onChange={() => handleCheck(section.id, item.id)}
                                                        className="ml-4 w-6 h-6 rounded-md bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-400 cursor-pointer flex-shrink-0"
                                                    />
                                                )}
                                            </div>
                                        </li>
                                        );
                                    })}
                                    {isEditMode && (
                                        <li className="p-3">
                                            <button onClick={() => handleAddItem(section.id)} className="w-full text-center py-2 bg-green-900 bg-opacity-50 text-green-300 rounded hover:bg-green-800 hover:bg-opacity-50 transition">
                                                + Ajouter une ligne
                                            </button>
                                        </li>
                                    )}
                                </ul>
                                )}
                            </div>
                            <ActionZone isEditMode={isEditMode} copiedSection={copiedSection} onAdd={() => handleAddSection(index + 1)} onPaste={() => onPasteSection(checklist.id, index + 1)} onDrop={() => handleSectionDrop(index + 1)} />
                        </React.Fragment>
                    )})
                ) : (
                    <div className="text-center py-8 text-gray-400 italic">
                        Aucun item ne correspond à votre recherche.
                    </div>
                )}
            </div>
        </div>
    );
};


// --- SCROLL TO TOP BUTTON ---
const ScrollToTopButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = useCallback(() => {
    if (window.scrollY > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    window.addEventListener('scroll', toggleVisibility);
    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, [toggleVisibility]);

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Retour en haut"
      title="Retour en haut de page"
      className={`group fixed bottom-6 right-6 z-40 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
    >
      <FaArrowUp size={20} />
      <span className="absolute bottom-1/2 translate-y-1/2 right-full mr-2 w-max px-2 py-1 bg-gray-600 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        Retour en haut de page
      </span>
    </button>
  );
};


// --- Checklist Title Indicator ---
const ChecklistTitleIndicator: React.FC<{ title: string }> = ({ title }) => {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = useCallback(() => {
    if (window.scrollY > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', toggleVisibility);
    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, [toggleVisibility]);

  if (!title) return null;

  return (
    <div
      className={`fixed bottom-6 left-6 z-40 text-white text-sm px-3 py-1 rounded-full bg-black bg-opacity-50 transition-all duration-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
    >
      {title}
    </div>
  );
};


// --- MAIN APP COMPONENT ---

const initialUsefulLinks: UsefulLink[] = [
    { id: 'link-1', title: 'Coin des pilotes', url: 'https://www.aero-club-poitou.fr/acp/coin-des-pilotes' },
    { id: 'link-2', title: 'OpenFlyers', url: 'https://openflyers.com/acp/' },
];

const App: React.FC = () => {
  const [checklists, setChecklists] = useState<Checklist[]>(() => {
    try {
        const saved = window.localStorage.getItem('acp_checklists');
        return saved ? JSON.parse(saved) : INITIAL_CHECKLISTS;
    } catch (e) {
        console.error("Failed to load checklists from localStorage.", e);
        return INITIAL_CHECKLISTS;
    }
  });
  const [history, setHistory] = useState<Checklist[][]>([]);
  const [redoStack, setRedoStack] = useState<Checklist[][]>([]);
  
  const [startupPreference, setStartupPreference] = useState<StartupPreference>(() => {
    try {
        const saved = window.localStorage.getItem('acp_startupPreference');
        return saved === 'last_viewed' ? 'last_viewed' : 'summary';
    } catch (e) {
        console.error("Failed to load startup preference from localStorage.", e);
        return 'summary';
    }
  });

  const [activeTab, setActiveTab] = useState<string>(() => {
    try {
        const savedPref = window.localStorage.getItem('acp_startupPreference');
        const pref = savedPref === 'last_viewed' ? 'last_viewed' : 'summary';
        
        if (pref === 'last_viewed') {
            const savedTab = window.localStorage.getItem('acp_activeTab');
            return savedTab ? JSON.parse(savedTab) : 'summary';
        }
        return 'summary';
    } catch (e) {
        console.error("Failed to initialize active tab from localStorage.", e);
        return 'summary';
    }
  });
  
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [copiedSection, setCopiedSection] = useState<ChecklistSection | null>(null);
  const [usefulLinks, setUsefulLinks] = useState<UsefulLink[]>(() => {
    try {
        const saved = window.localStorage.getItem('acp_usefulLinks');
        return saved ? JSON.parse(saved) : initialUsefulLinks;
    } catch (e) {
        console.error("Failed to load useful links from localStorage.", e);
        return initialUsefulLinks;
    }
  });

  const [backups, setBackups] = useState<Backup[]>(() => {
    try {
        const saved = window.localStorage.getItem('acp_backups');
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        console.error("Failed to load backups from localStorage.", e);
        return [];
    }
  });

  // Modal states
  const [checklistToDelete, setChecklistToDelete] = useState<string | null>(null);
  const [checklistToDuplicate, setChecklistToDuplicate] = useState<Checklist | null>(null);
  const [checklistToRename, setChecklistToRename] = useState<Checklist | null>(null);
  const [newChecklistName, setNewChecklistName] = useState("");
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isResetConfirmModalOpen, setIsResetConfirmModalOpen] = useState(false);
  
  // Backup modal states
  const [isCreateBackupModalOpen, setIsCreateBackupModalOpen] = useState(false);
  const [newBackupName, setNewBackupName] = useState("");
  const [backupToRestore, setBackupToRestore] = useState<Backup | null>(null);
  const [backupToDelete, setBackupToDelete] = useState<Backup | null>(null);


  const headerRef = useRef<HTMLElement>(null);

  // --- LocalStorage Persistence ---
  useEffect(() => {
    try {
        window.localStorage.setItem('acp_checklists', JSON.stringify(checklists));
    } catch (e) {
        console.error("Failed to save checklists to localStorage.", e);
    }
  }, [checklists]);
  
  useEffect(() => {
    try {
        window.localStorage.setItem('acp_usefulLinks', JSON.stringify(usefulLinks));
    } catch (e) {
        console.error("Failed to save useful links to localStorage.", e);
    }
  }, [usefulLinks]);

  useEffect(() => {
    try {
        window.localStorage.setItem('acp_activeTab', JSON.stringify(activeTab));
    } catch (e) {
        console.error("Failed to save active tab to localStorage.", e);
    }
  }, [activeTab]);

  useEffect(() => {
    try {
        window.localStorage.setItem('acp_startupPreference', startupPreference);
    } catch (e) {
        console.error("Failed to save startup preference to localStorage.", e);
    }
  }, [startupPreference]);
  
   useEffect(() => {
    try {
        const sortedBackups = [...backups].sort((a, b) => b.timestamp - a.timestamp);
        window.localStorage.setItem('acp_backups', JSON.stringify(sortedBackups));
    } catch (e) {
        console.error("Failed to save backups to localStorage.", e);
    }
  }, [backups]);


  // Validate active tab on load/checklist change
  useEffect(() => {
    if (activeTab !== 'summary' && activeTab !== 'links' && activeTab !== 'guide') {
        if (!checklists.some(c => c.id === activeTab)) {
            setActiveTab('summary');
        }
    }
  }, [activeTab, checklists]);

  useEffect(() => {
    const updateHeaderHeight = () => {
      if (headerRef.current) {
        const headerHeight = headerRef.current.offsetHeight;
        document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
      }
    };

    const resizeObserver = new ResizeObserver(updateHeaderHeight);
    
    const currentHeader = headerRef.current;
    if (currentHeader) {
      resizeObserver.observe(currentHeader);
    }
    
    updateHeaderHeight();

    return () => {
      if (currentHeader) {
        resizeObserver.unobserve(currentHeader);
      }
    };
  }, []);


  const updateChecklistsAndSaveHistory = useCallback((updater: (prevChecklists: Checklist[]) => Checklist[]) => {
    setChecklists(currentChecklists => {
        setHistory(prevHistory => [...prevHistory, currentChecklists]);
        setRedoStack([]); // Clear redo stack on new action
        return updater(currentChecklists);
    });
  }, []);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const lastState = history[history.length - 1];
    setChecklists(currentState => {
        setRedoStack(prev => [currentState, ...prev]);
        return lastState;
    });
    setHistory(prevHistory => prevHistory.slice(0, -1));
  }, [history]);

  const handleRedo = useCallback(() => {
      if (redoStack.length === 0) return;
      const nextState = redoStack[0];
      setChecklists(currentState => {
          setHistory(prev => [...prev, currentState]);
          return nextState;
      });
      setRedoStack(prev => prev.slice(1));
  }, [redoStack]);

  const handleToggleEditMode = useCallback(() => {
    setIsEditMode(prev => !prev);
    setHistory([]); // Clear history when toggling mode
    setRedoStack([]);
  }, []);
  
  const handleChecklistChange = (updatedChecklist: Checklist) => {
    // This function can be called rapidly (e.g., by notes textarea), 
    // so we don't save to history here. History is for discrete edit-mode actions.
    setChecklists(prev => prev.map(c => c.id === updatedChecklist.id ? updatedChecklist : c));
  }
  
  const handleChecklistChangeWithHistory = (updatedChecklist: Checklist) => {
    updateChecklistsAndSaveHistory(prev => prev.map(c => c.id === updatedChecklist.id ? updatedChecklist : c));
  }


  const handleTabChange = (tabId: string) => {
    if (activeTab !== tabId) {
        window.scrollTo(0, 0);
        setActiveTab(tabId);
    }
  };

  const handleAddChecklist = (title: string): boolean => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
        alert("Le nom de la checklist ne peut pas être vide.");
        return false;
    }
    if (checklists.some(c => c.title.toLowerCase() === trimmedTitle.toLowerCase())) {
        alert("Une checklist avec ce nom existe déjà.");
        return false;
    }

    const newChecklist: Checklist = {
      id: idCounter.next(),
      title: trimmedTitle,
      aircrafts: [],
      sections: [{id: idCounter.next(), title: 'Nouvelle Section', items: []}],
      notes: ''
    };
    updateChecklistsAndSaveHistory(prev => [...prev, newChecklist]);
    handleTabChange(newChecklist.id);
    return true;
  }

  const handleDeleteChecklist = (checklistId: string) => {
    setChecklistToDelete(checklistId);
  }

  const confirmDeleteChecklist = () => {
    if (!checklistToDelete) return;
    updateChecklistsAndSaveHistory(prev => prev.filter(c => c.id !== checklistToDelete));
    if (activeTab === checklistToDelete) {
        handleTabChange('summary');
    }
    setChecklistToDelete(null);
  }

  const handleDuplicateChecklist = (checklistId: string) => {
    const checklistToCopy = checklists.find(c => c.id === checklistId);
    if (checklistToCopy) {
      setChecklistToDuplicate(checklistToCopy);
      setNewChecklistName(`${checklistToCopy.title} - copie`);
    }
  }

  const confirmDuplicateChecklist = () => {
    if (!checklistToDuplicate) return;
    
    const newTitle = newChecklistName.trim();
    if (!newTitle) { alert("Le nom ne peut pas être vide."); return; }
    if (checklists.some(c => c.title.toLowerCase() === newTitle.toLowerCase())) {
        alert("Une checklist avec ce nom existe déjà."); return;
    }

    const newChecklist: Checklist = {
        id: idCounter.next(),
        title: newTitle,
        aircrafts: checklistToDuplicate.aircrafts.map(ac => ({...ac, id: idCounter.next()})),
        sections: deepCopyWithNewIds(checklistToDuplicate.sections),
        notes: checklistToDuplicate.notes || '',
    };

    updateChecklistsAndSaveHistory(prev => [...prev, newChecklist]);
    handleTabChange(newChecklist.id);
    setChecklistToDuplicate(null);
    setNewChecklistName("");
  }

  const handleRenameChecklist = (checklistId: string) => {
    const checklist = checklists.find(c => c.id === checklistId);
    if (checklist) {
        setChecklistToRename(checklist);
        setNewChecklistName(checklist.title);
    }
  };

  const confirmRenameChecklist = () => {
    if (!checklistToRename) return;
    const newTitle = newChecklistName.trim();
    if (!newTitle) { alert("Le nom ne peut pas être vide."); return; }
    if (checklists.some(c => c.id !== checklistToRename.id && c.title.toLowerCase() === newTitle.toLowerCase())) {
        alert("Une autre checklist avec ce nom existe déjà."); return;
    }
    
    updateChecklistsAndSaveHistory(prev => prev.map(c => c.id === checklistToRename.id ? { ...c, title: newTitle } : c));
    setChecklistToRename(null);
    setNewChecklistName("");
  };

  const handleCopySection = (section: ChecklistSection) => {
    setCopiedSection(section);
  };

  const handlePasteSection = (targetChecklistId: string, targetIndex: number) => {
    if (!copiedSection) return;

    const newSection = deepCopySectionWithNewIds(copiedSection);
    newSection.title = `${newSection.title} - copie`;

    updateChecklistsAndSaveHistory(prev => {
        return prev.map(cl => {
            if (cl.id === targetChecklistId) {
                const newSections = [...cl.sections];
                newSections.splice(targetIndex, 0, newSection);
                return { ...cl, sections: newSections };
            }
            return cl;
        });
    });
  };

    const handleAddLink = (title: string, url: string) => {
        const newLink: UsefulLink = { id: idCounter.next(), title, url };
        setUsefulLinks(prev => [...prev, newLink]);
    };

    const handleUpdateLink = (id: string, newTitle: string, newUrl: string) => {
        setUsefulLinks(prev => prev.map(link => 
            link.id === id ? { ...link, title: newTitle, url: newUrl } : link
        ));
    };

    const handleDeleteLink = (id: string) => {
        setUsefulLinks(prev => prev.filter(link => link.id !== id));
    };

  const handleOpenResetConfirm = () => {
      setIsSettingsModalOpen(false);
      setIsResetConfirmModalOpen(true);
  };

  const handleConfirmReset = () => {
      setHistory([]);
      setRedoStack([]);
      setChecklists(INITIAL_CHECKLISTS);
      setUsefulLinks(initialUsefulLinks);
      setActiveTab('summary');
      setStartupPreference('summary');
      setIsResetConfirmModalOpen(false);
  };

    const handleOpenCreateBackupModal = () => {
        const d = new Date();
        const datePart = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
        const timePart = `${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
        setNewBackupName(`${datePart}-${timePart}`);
        setIsCreateBackupModalOpen(true);
    };

    const handleConfirmCreateBackup = () => {
        const trimmedName = newBackupName.trim();
        if (!trimmedName) {
            alert("Le nom de la sauvegarde ne peut pas être vide.");
            return;
        }
        if (backups.some(b => b.name.toLowerCase() === trimmedName.toLowerCase())) {
            alert("Une sauvegarde avec ce nom existe déjà.");
            return;
        }

        const currentState: AppState = {
            checklists,
            usefulLinks,
            startupPreference,
        };

        const newBackup: Backup = {
            id: idCounter.next(),
            name: trimmedName,
            timestamp: Date.now(),
            data: currentState,
        };

        setBackups(prev => [newBackup, ...prev]);
        setIsCreateBackupModalOpen(false);
    };

    const handleConfirmRestoreBackup = () => {
        if (!backupToRestore) return;
        
        const { checklists, usefulLinks, startupPreference } = backupToRestore.data;
        
        setChecklists(checklists);
        setUsefulLinks(usefulLinks);
        setStartupPreference(startupPreference);
        setHistory([]);
        setRedoStack([]);
        setActiveTab('summary');
        setBackupToRestore(null);
        setIsSettingsModalOpen(false);
    };

    const handleConfirmDeleteBackup = () => {
        if (!backupToDelete) return;
        setBackups(prev => prev.filter(b => b.id !== backupToDelete.id));
        setBackupToDelete(null);
    };


  const sortedChecklists = useMemo(() => {
    return [...checklists].sort((a, b) => a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' }));
  }, [checklists]);


  const currentChecklist = checklists.find(c => c.id === activeTab);
  let showGlobalWarning = false;
    if (currentChecklist && !isEditMode) {
        const allItems = currentChecklist.sections.flatMap(s => s.items);
        const lastCheckedIndex = allItems.reduce((lastIndex, item, currentIndex) =>
            item.checked ? currentIndex : lastIndex,
        -1);

        if (lastCheckedIndex > 0) {
            showGlobalWarning = allItems.slice(0, lastCheckedIndex).some(item => !item.checked);
        }
    }


  const renderContent = () => {
    if (activeTab === 'summary') {
      return <SummaryComponent 
                checklists={sortedChecklists} 
                onTabChange={handleTabChange} 
                isEditMode={isEditMode} 
                onDeleteChecklist={handleDeleteChecklist}
                onAddChecklist={handleAddChecklist}
                onDuplicateChecklist={handleDuplicateChecklist}
                onRenameChecklist={handleRenameChecklist}
             />;
    }
    if (activeTab === 'links') {
      return <LinksComponent 
                links={usefulLinks}
                isEditMode={isEditMode}
                onAddLink={handleAddLink}
                onUpdateLink={handleUpdateLink}
                onDeleteLink={handleDeleteLink}
             />;
    }
    if (activeTab === 'guide') {
        return <GuideComponent />;
    }
    if (currentChecklist) {
      return <ChecklistComponent 
                checklist={currentChecklist} 
                onChecklistChange={isEditMode ? handleChecklistChangeWithHistory : handleChecklistChange} 
                isEditMode={isEditMode} 
                copiedSection={copiedSection}
                onCopySection={handleCopySection}
                onPasteSection={handlePasteSection}
            />;
    }
    handleTabChange('summary'); 
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Header
        ref={headerRef}
        isEditMode={isEditMode} 
        onToggleEditMode={handleToggleEditMode} 
        canUndo={history.length > 0}
        onUndo={handleUndo}
        canRedo={redoStack.length > 0}
        onRedo={handleRedo}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />
       {showGlobalWarning && (
            <div className="sticky top-[var(--header-height)] z-20 bg-red-900 text-red-200 p-3 text-center font-semibold">
                ATTENTION, certains items n’ont pas été vérifiés !
            </div>
        )}
      <main className="container mx-auto p-2 sm:p-4 pb-32">
        <div className="border-b border-gray-700">
          <TabsComponent
            checklists={sortedChecklists}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
        </div>
        <div className="mt-6">{renderContent()}</div>
      </main>

      <Modal
        isOpen={!!checklistToDelete}
        onClose={() => setChecklistToDelete(null)}
        title="Confirmer la suppression"
      >
        <p className="text-gray-300">Êtes-vous sûr de vouloir supprimer cette checklist ?</p>
        <div className="flex justify-end gap-4 mt-6">
          <button onClick={() => setChecklistToDelete(null)} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">Annuler</button>
          <button onClick={confirmDeleteChecklist} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">Supprimer</button>
        </div>
      </Modal>

      <Modal
        isOpen={!!checklistToDuplicate}
        onClose={() => setChecklistToDuplicate(null)}
        title="Dupliquer la checklist"
      >
        <div>
          <label htmlFor="new-checklist-name-duplicate" className="block text-sm font-medium text-gray-300 mb-2">
            Nouveau nom pour la checklist
          </label>
          <input
            type="text"
            id="new-checklist-name-duplicate"
            value={newChecklistName}
            onChange={(e) => setNewChecklistName(e.target.value)}
            onKeyDown={(e) => {if(e.key === 'Enter') confirmDuplicateChecklist()}}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-4 mt-6">
          <button onClick={() => setChecklistToDuplicate(null)} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">Annuler</button>
          <button onClick={confirmDuplicateChecklist} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">Dupliquer</button>
        </div>
      </Modal>

      <Modal
        isOpen={!!checklistToRename}
        onClose={() => setChecklistToRename(null)}
        title="Renommer la checklist"
      >
        <div>
          <label htmlFor="new-checklist-name-rename" className="block text-sm font-medium text-gray-300 mb-2">
            Nouveau nom
          </label>
          <input
            type="text"
            id="new-checklist-name-rename"
            value={newChecklistName}
            onChange={(e) => setNewChecklistName(e.target.value)}
            onKeyDown={(e) => {if(e.key === 'Enter') confirmRenameChecklist()}}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-4 mt-6">
          <button onClick={() => setChecklistToRename(null)} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">Annuler</button>
          <button onClick={confirmRenameChecklist} className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors">Renommer</button>
        </div>
      </Modal>

      <Modal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        title="Paramètres"
      >
        <div className="space-y-6 text-gray-300">
            <div>
                <h4 className="font-bold text-lg mb-2 text-white">Affichage à l'ouverture</h4>
                <div className="space-y-2">
                    <label className="flex items-center cursor-pointer" title="affichera le sommaire à l'ouverture de l'application - par défaut">
                        <input type="radio" name="startup" value="summary" checked={startupPreference === 'summary'} onChange={() => setStartupPreference('summary')} className="h-4 w-4 text-blue-500 bg-gray-700 border-gray-600 focus:ring-blue-400" />
                        <span className="ml-2">Afficher le sommaire</span>
                    </label>
                    <label className="flex items-center cursor-pointer" title="Ouvrir l'application dans l'onglet affiché à la fermeture">
                        <input type="radio" name="startup" value="last_viewed" checked={startupPreference === 'last_viewed'} onChange={() => setStartupPreference('last_viewed')} className="h-4 w-4 text-blue-500 bg-gray-700 border-gray-600 focus:ring-blue-400" />
                        <span className="ml-2">Afficher comme quitté</span>
                    </label>
                </div>
            </div>

            <div className="border-t border-gray-700"></div>

            <div>
                <h4 className="font-bold text-lg mb-2 text-white">Sauvegardes</h4>
                <p className="text-sm text-gray-400 mb-3">
                    Gérez des sauvegardes de l'état complet de l'application (checklists, liens, paramètres).
                </p>
                <button
                    onClick={handleOpenCreateBackupModal}
                    className="w-full mb-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                    Créer une nouvelle sauvegarde
                </button>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                    {backups.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">Aucune sauvegarde.</p>
                    ) : (
                        backups.map(backup => (
                            <div key={backup.id} className="bg-gray-700 p-3 rounded-md flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                <div>
                                    <p className="font-semibold text-white">{backup.name}</p>
                                    <p className="text-xs text-gray-400">{new Date(backup.timestamp).toLocaleString('fr-FR')}</p>
                                </div>
                                <div className="flex items-center space-x-2 self-end sm:self-center">
                                    <button onClick={() => setBackupToRestore(backup)} className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition">Restaurer</button>
                                    <button onClick={() => setBackupToDelete(backup)} className="p-2 text-red-400 hover:text-red-300 rounded hover:bg-gray-600 transition" title="Supprimer">
                                        <FaTrash />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="border-t border-gray-700"></div>

            <div>
                <h4 className="font-bold text-lg mb-2 text-white">Réinitialisation</h4>
                <p className="text-sm text-gray-400 mb-3">
                    Remettre l'application aux paramètres d'origine. Toutes vos checklists et liens personnalisés seront définitivement supprimés.
                </p>
                <button
                    onClick={handleOpenResetConfirm}
                    className="w-full px-4 py-2 bg-red-800 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                    Remettre les réglages par défaut
                </button>
            </div>
        </div>
      </Modal>

      <Modal
        isOpen={isResetConfirmModalOpen}
        onClose={() => setIsResetConfirmModalOpen(false)}
        title="Confirmer la réinitialisation"
      >
        <p className="text-gray-300">
            Ceci remettra les paramètres d'origine, toutes les modifications seront perdues !
        </p>
        <div className="flex justify-end gap-4 mt-6">
            <button onClick={() => setIsResetConfirmModalOpen(false)} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">
                Annuler
            </button>
            <button onClick={handleConfirmReset} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-bold">
                ⚠️ Confirmer ⚠️
            </button>
        </div>
      </Modal>
      
      <Modal
        isOpen={isCreateBackupModalOpen}
        onClose={() => setIsCreateBackupModalOpen(false)}
        title="Créer une sauvegarde"
        >
        <div>
          <label htmlFor="new-backup-name" className="block text-sm font-medium text-gray-300 mb-2">
            Nom de la sauvegarde
          </label>
          <input
            type="text"
            id="new-backup-name"
            value={newBackupName}
            onChange={(e) => setNewBackupName(e.target.value)}
            onKeyDown={(e) => {if(e.key === 'Enter') handleConfirmCreateBackup()}}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-4 mt-6">
          <button onClick={() => setIsCreateBackupModalOpen(false)} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">Annuler</button>
          <button onClick={handleConfirmCreateBackup} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">Sauvegarder</button>
        </div>
      </Modal>

      <Modal
        isOpen={!!backupToRestore}
        onClose={() => setBackupToRestore(null)}
        title="Confirmer la restauration"
      >
        <p className="text-gray-300">
            Êtes-vous sûr de vouloir restaurer la sauvegarde "<strong>{backupToRestore?.name}</strong>" ?
            <br />
            Toutes les modifications non sauvegardées actuelles seront perdues.
        </p>
        <div className="flex justify-end gap-4 mt-6">
            <button onClick={() => setBackupToRestore(null)} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">
                Annuler
            </button>
            <button onClick={handleConfirmRestoreBackup} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-bold">
                Restaurer
            </button>
        </div>
      </Modal>

      <Modal
        isOpen={!!backupToDelete}
        onClose={() => setBackupToDelete(null)}
        title="Confirmer la suppression"
      >
        <p className="text-gray-300">
            Êtes-vous sûr de vouloir supprimer la sauvegarde "<strong>{backupToDelete?.name}</strong>" ?
            <br />
            Cette action est irréversible.
        </p>
        <div className="flex justify-end gap-4 mt-6">
            <button onClick={() => setBackupToDelete(null)} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">
                Annuler
            </button>
            <button onClick={handleConfirmDeleteBackup} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-bold">
                Supprimer
            </button>
        </div>
      </Modal>


      <ScrollToTopButton />
      <ChecklistTitleIndicator title={currentChecklist ? currentChecklist.title : ''} />
    </div>
  );
};

export default App;