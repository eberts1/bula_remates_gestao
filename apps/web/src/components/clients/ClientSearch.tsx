'use client';



interface Props {

  value: string;

  onChange: (value: string) => void;

}



export function ClientSearch({ value, onChange }: Props) {

  return (

    <label style={{ flex: 1, minWidth: 200 }}>

      Buscar cliente

      <input

        type="search"

        placeholder="Nome, documento ou e-mail..."

        value={value}

        onChange={(e) => onChange(e.target.value)}

      />

    </label>

  );

}


