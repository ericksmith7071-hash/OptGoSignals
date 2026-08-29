import { useState } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Asset, MarketType } from '@/types';
import { assetsData } from '@/data/assets';

interface AssetPanelProps {
  selectedAsset: Asset | null;
  onSelectAsset: (asset: Asset) => void;
}

const ITEMS_PER_PAGE = 24;

type CategoryFilter = 'all' | 'forex' | 'crypto' | 'commodity' | 'index' | 'stock';

const CATEGORY_LABELS: Record<CategoryFilter, string> = {
  all: 'Todos',
  forex: '💱 Forex',
  crypto: '₿ Crypto',
  commodity: '🪙 Commodity',
  index: '📈 Índices',
  stock: '🏢 Ações',
};

export default function AssetPanel({ selectedAsset, onSelectAsset }: AssetPanelProps) {
  const [marketType, setMarketType] = useState<MarketType>('otc');
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');

  const allAssets = assetsData[marketType];

  const availCats = Array.from(new Set(allAssets.map(a => a.category).filter(Boolean))) as CategoryFilter[];

  const filtered = allAssets.filter(a => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) || a.symbol.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'all' || a.category === category;
    return matchSearch && matchCat;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const pageAssets = filtered.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
  const openCount = allAssets.filter(a => a.open).length;

  const handleMarketChange = (type: MarketType) => {
    setMarketType(type);
    setPage(0);
    setSearch('');
    setCategory('all');
  };

  const handleSearch = (val: string) => { setSearch(val); setPage(0); };
  const handleCategory = (cat: CategoryFilter) => { setCategory(cat); setPage(0); };

  return (
    <div className="flex flex-col">
      {/* Tabs */}
      <div className="px-4 pt-3 pb-2 border-b border-border bg-secondary/20 space-y-2.5">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5 flex-1">
            <button onClick={() => handleMarketChange('otc')} className={`flex-1 py-1.5 rounded text-xs font-semibold transition-all duration-200 ${marketType === 'otc' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
              📊 OptGo OTC
            </button>
            <button onClick={() => handleMarketChange('market')} className={`flex-1 py-1.5 rounded text-xs font-semibold transition-all duration-200 ${marketType === 'market' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
              🌍 Aberto
            </button>
          </div>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">{openCount}/{allAssets.length} abertos</span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar ativo..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="w-full bg-background border border-border rounded pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-1">
          <button onClick={() => handleCategory('all')} className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${category === 'all' ? 'bg-primary/20 border border-primary/40 text-primary' : 'bg-secondary text-muted-foreground hover:text-foreground border border-transparent'}`}>
            Todos
          </button>
          {availCats.map(cat => (
            <button key={cat} onClick={() => handleCategory(cat)} className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${category === cat ? 'bg-primary/20 border border-primary/40 text-primary' : 'bg-secondary text-muted-foreground hover:text-foreground border border-transparent'}`}>
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
          <span className="ml-auto text-[10px] text-primary">{filtered.length} ativos</span>
        </div>

        <div className="flex gap-4">
          <span className="text-[10px] text-muted-foreground flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" /> Aberto</span>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" /> Fechado</span>
        </div>
      </div>

      {/* Asset grid */}
      <div className="overflow-y-auto scrollbar-thin px-3 py-2.5" style={{ maxHeight: '280px' }}>
        {pageAssets.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-xs">Nenhum ativo encontrado</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1">
            {pageAssets.map(asset => {
              const isSelected = selectedAsset?.symbol === asset.symbol;
              return (
                <button
                  key={asset.symbol}
                  onClick={() => onSelectAsset(asset)}
                  title={`${asset.name}${asset.payout ? ` — Payout: ${asset.payout}%` : ''}`}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-left transition-all duration-150 min-w-0 ${
                    isSelected
                      ? 'bg-primary/15 border border-primary/40'
                      : 'hover:bg-secondary/60 border border-transparent hover:border-border'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${asset.open ? 'bg-green-400' : 'bg-red-500'}`} />
                  <div className="min-w-0 flex-1">
                    <div className={`text-[11px] font-medium truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>{asset.name}</div>
                    {asset.payout && <div className="text-[9px] text-muted-foreground">{asset.payout}%</div>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-2 border-t border-border flex items-center justify-between">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1 rounded hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <span className="text-[11px] text-muted-foreground font-mono">{page + 1} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} className="p-1 rounded hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      )}
    </div>
  );
}
