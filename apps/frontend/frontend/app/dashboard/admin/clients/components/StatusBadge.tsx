interface Props {
  isOnline: boolean;
}

export function StatusBadge({ isOnline }: Props) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
          isOnline
            ? "bg-green-500 shadow-[0_0_6px_2px_rgba(34,197,94,0.5)] animate-pulse"
            : "bg-gray-300"
        }`}
      />
      <span className={`text-xs font-medium ${
        isOnline ? "text-green-600" : "text-gray-400"
      }`}>
        {isOnline ? "En ligne" : "Hors ligne"}
      </span>
    </div>
  );
}