// components/CustomTable.tsx
import React from 'react'
import { Table } from 'vtex.styleguide'

interface CustomTableProps {
    schema: any;
    items: any[];
    loading: boolean;
    onRowClick?: (rowData: any) => void;
}

const CustomTable: React.FC<CustomTableProps> = ({ schema, items, loading, onRowClick }) => {
    return (
        <Table
            fullWidth
            schema={schema}
            items={items}
            loading={loading}
            density="medium"
            onRowClick={onRowClick}
        />
    )
}

export default CustomTable
