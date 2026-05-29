"use client";

import { Command } from "cmdk";
import { useEffect } from "react";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recentSearches: string[];
  onSearchFocus: () => void;
  onSelectRecent: (name: string) => void;
  onCopyResults: () => void;
  onExportReport: () => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  recentSearches,
  onSearchFocus,
  onSelectRecent,
  onCopyResults,
  onExportReport,
}: CommandPaletteProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange]);

  return (
    <Command.Dialog open={open} onOpenChange={onOpenChange}>
      <div
        className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div className="fixed left-1/2 top-[18%] z-50 w-[92vw] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-white shadow-[0_40px_120px_-50px_rgba(15,23,42,0.4)]">
        <Command className="flex w-full flex-col">
          <div className="border-b border-border px-4 py-3">
            <Command.Input
              placeholder="Search commands..."
              className="w-full bg-transparent text-sm text-primary outline-none placeholder:text-secondary"
            />
          </div>
          <Command.List className="max-h-[320px] overflow-y-auto px-2 py-2 text-sm">
            <Command.Group heading="Actions">
              <Command.Item
                className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-primary aria-selected:bg-zinc-100"
                onSelect={() => {
                  onOpenChange(false);
                  onSearchFocus();
                }}
              >
                <span>Search Name</span>
                <span className="text-xs text-secondary">⌘K</span>
              </Command.Item>
              <Command.Item
                className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-primary aria-selected:bg-zinc-100"
                onSelect={() => {
                  onOpenChange(false);
                  onCopyResults();
                }}
              >
                <span>Copy Results</span>
                <span className="text-xs text-secondary">⇧⌘C</span>
              </Command.Item>
              <Command.Item
                className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-primary aria-selected:bg-zinc-100"
                onSelect={() => {
                  onOpenChange(false);
                  onExportReport();
                }}
              >
                <span>Export Report</span>
                <span className="text-xs text-secondary">⇧⌘E</span>
              </Command.Item>
            </Command.Group>
            {recentSearches.length > 0 && (
              <Command.Group heading="Recent Searches">
                {recentSearches.map((name) => (
                  <Command.Item
                    key={name}
                    className="flex cursor-pointer items-center rounded-lg px-3 py-2 text-primary aria-selected:bg-zinc-100"
                    onSelect={() => {
                      onOpenChange(false);
                      onSelectRecent(name);
                    }}
                  >
                    {name}
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </div>
    </Command.Dialog>
  );
}
