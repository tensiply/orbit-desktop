import { useCallback } from 'react'
import { RotateCcw } from 'lucide-react'
import { useAppStore } from '../store'
import type { Setting } from '../types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { Input } from './ui/input'
import { UpdatesSection } from './UpdatesSection'
import { ShortcutsView } from './ShortcutsView'

// ── Controls ───────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none ${
        checked ? 'bg-primary' : 'bg-foreground/15'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

function NumberInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <Input
      type="number"
      value={value}
      onChange={(e) => {
        const n = parseInt(e.target.value, 10)
        if (!isNaN(n)) onChange(n)
      }}
      className="h-7 w-28 text-xs font-mono"
    />
  )
}

function StringInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 w-48 text-xs font-mono"
    />
  )
}

function SelectInput({
  value,
  options,
  onChange,
}: {
  value: string
  options: { label: string; value: string }[]
  onChange: (v: string) => void
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-7 w-44 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="text-xs">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// ── SettingRow ─────────────────────────────────────────────────────────────────

function SettingRow({
  setting,
  onUpdate,
  onReset,
}: {
  setting: Setting
  onUpdate: (id: string, value: Setting['value']) => void
  onReset: (id: string) => void
}) {
  const isModified = setting.value !== setting.default

  const control = (() => {
    switch (setting.type) {
      case 'boolean':
        return (
          <Toggle
            checked={setting.value as boolean}
            onChange={(v) => onUpdate(setting.id, v)}
          />
        )
      case 'number':
        return (
          <NumberInput
            value={setting.value as number}
            onChange={(v) => onUpdate(setting.id, v)}
          />
        )
      case 'string':
        return (
          <StringInput
            value={setting.value as string}
            onChange={(v) => onUpdate(setting.id, v)}
          />
        )
      case 'select':
        return (
          <SelectInput
            value={setting.value as string}
            options={setting.options ?? []}
            onChange={(v) => onUpdate(setting.id, v)}
          />
        )
    }
  })()

  return (
    <div className="group flex items-start gap-4 px-6 py-4 border-b border-foreground/5 hover:bg-foreground/2 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground leading-snug">{setting.name}</span>
          {isModified && (
            <span className="text-[9px] px-1.5 py-px rounded-full bg-primary/15 text-primary/70 font-medium">
              modified
            </span>
          )}
        </div>
        <p className="text-[11px] text-foreground/40 leading-snug mt-0.5">{setting.description}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0 pt-0.5">
        {control}
        {isModified && (
          <button
            onClick={() => onReset(setting.id)}
            title="Reset to default"
            className="text-foreground/20 hover:text-foreground/60 transition-colors opacity-0 group-hover:opacity-100"
          >
            <RotateCcw size={12} />
          </button>
        )}
      </div>
    </div>
  )
}

// ── SettingsView ───────────────────────────────────────────────────────────────

export function SettingsView() {
  const settings            = useAppStore((s) => s.settings)
  const updateSetting       = useAppStore((s) => s.updateSetting)
  const resetSetting        = useAppStore((s) => s.resetSetting)
  const activeCategory      = useAppStore((s) => s.activeSettingsCategory)

  const handleUpdate = useCallback(
    (id: string, value: Setting['value']) => updateSetting(id, value),
    [updateSetting],
  )
  const handleReset = useCallback((id: string) => resetSetting(id), [resetSetting])

  const isUpdatesCategory   = activeCategory === 'updates'
  const isShortcutsCategory = activeCategory === 'shortcuts'

  const filtered = (isUpdatesCategory || isShortcutsCategory)
    ? []
    : settings.filter((s) => s.category === activeCategory)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto min-h-0">
        {isUpdatesCategory ? (
          <UpdatesSection />
        ) : isShortcutsCategory ? (
          <ShortcutsView />
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-xs text-foreground/30">
            No settings in this category
          </div>
        ) : (
          filtered.map((s) => (
            <SettingRow
              key={s.id}
              setting={s}
              onUpdate={handleUpdate}
              onReset={handleReset}
            />
          ))
        )}
      </div>
    </div>
  )
}
