import { useRef } from 'react';
import { X } from 'lucide-react';
import { useStore } from '../../store';

interface SettingsPanelProps {
  onClose: () => void;
}

const themes = [
  { id: 'default', name: 'Default Purple', class: 'from-primary-500 to-secondary-500' },
  { id: 'ocean', name: 'Ocean Blue', class: 'from-blue-500 to-teal-500' },
  { id: 'sunset', name: 'Sunset', class: 'from-orange-500 to-pink-500' },
  { id: 'forest', name: 'Forest Green', class: 'from-green-500 to-emerald-700' },
  { id: 'purple', name: 'Deep Purple', class: 'from-purple-500 to-indigo-700' },
  { id: 'night', name: 'Night Mode', class: 'from-gray-800 to-gray-900' },
  { id: 'rose', name: 'Rose', class: 'from-rose-500 to-red-600' },
];

const SettingsPanel = ({ onClose }: SettingsPanelProps) => {
  const { backgroundTheme, setBackgroundTheme } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        localStorage.setItem('elarova_custom_bg', result);
        window.dispatchEvent(new CustomEvent('background-changed'));
        setBackgroundTheme('custom');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRevertBg = () => {
    localStorage.removeItem('elarova_custom_bg');
    setBackgroundTheme('default');
    window.dispatchEvent(new CustomEvent('background-changed'));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-80 max-h-[80vh] overflow-hidden">
        <div className="bg-gradient-to-r from-primary-500 to-secondary-500 p-3 flex items-center justify-between">
          <h3 className="text-white font-semibold">Settings</h3>
          <button onClick={onClose} className="text-white hover:bg-white/20 p-1 rounded">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Background Theme</h4>
            <div className="grid grid-cols-4 gap-2">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => {
                    setBackgroundTheme(theme.id);
                    localStorage.removeItem('elarova_custom_bg');
                    window.dispatchEvent(new CustomEvent('background-changed'));
                  }}
                  className={`w-full h-10 rounded-lg bg-gradient-to-br ${theme.class} ${
                    backgroundTheme === theme.id ? 'ring-2 ring-offset-2 ring-primary-500' : ''
                  }`}
                  title={theme.name}
                />
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-700 mb-2">Custom Background</h4>
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg text-sm transition-colors"
              >
                Upload Image
              </button>
              <button
                onClick={handleRevertBg}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg text-sm transition-colors"
              >
                Revert
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
