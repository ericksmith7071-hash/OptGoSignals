import { useState, useEffect } from 'react';
import { Activity, Clock } from 'lucide-react';

export default function Header() {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDate(now.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'short', day: '2-digit', month: 'short' }));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary/20 border border-primary/40 flex items-center justify-center">
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <div>
            <span className="font-bold text-base text-foreground tracking-wide">OPTGO</span>
            <span className="text-primary font-bold text-base"> SIGNALS</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 ml-2">
            <span className="w-2 h-2 rounded-full bg-primary pulse-dot" />
            <span className="text-xs text-muted-foreground font-medium">LIVE</span>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end">
            <div className="flex items-center gap-1.5 text-foreground font-mono text-sm font-semibold">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              {time}
            </div>
            <span className="text-xs text-muted-foreground capitalize">{date} • BRT</span>
          </div>
          <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded px-3 py-1.5">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs text-primary font-semibold">24h ATIVO</span>
          </div>
        </div>
      </div>
    </header>
  );
}
