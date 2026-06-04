'use client';

interface Props {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function ClientPagination({ page, totalPages, onPageChange }: Props) {
  if (totalPages <= 1) return null;

  return (
    <nav className="clients-pagination" aria-label="Paginação de clientes">
      <button
        type="button"
        className="ghost"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        ← Anterior
      </button>
      <span className="clients-pagination-info">
        Página {page} de {totalPages}
      </span>
      <button
        type="button"
        className="ghost"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Próxima →
      </button>
    </nav>
  );
}
