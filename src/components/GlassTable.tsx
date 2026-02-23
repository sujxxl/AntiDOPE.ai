type GlassTableProps = {
  headers: string[];
  data: (string | number | React.ReactNode)[][];
};

export default function GlassTable({ headers, data }: GlassTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-glass-stroke">
            {headers.map((header) => (
              <th key={header} className="p-4 text-sm font-semibold text-stone-400 uppercase tracking-wider">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-glass-stroke/50 last:border-none hover:bg-glass-highlight transition-colors duration-300">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="p-4 text-white">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
