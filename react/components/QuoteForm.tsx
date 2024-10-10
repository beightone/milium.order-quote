// components/QuoteForm.tsx
import React from 'react'
import { Input, Textarea } from 'vtex.styleguide'

interface QuoteFormProps {
    name: string;
    description: string;
    errorMessage: string;
    onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onDescriptionChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

const QuoteForm: React.FC<QuoteFormProps> = ({ name, description, errorMessage, onNameChange, onDescriptionChange }) => (
    <div>
        <Input
            placeholder="Enter the quote name"
            label="Quote Name"
            value={name}
            errorMessage={errorMessage}
            onChange={onNameChange}
        />
        <Textarea
            label="Description"
            value={description}
            onChange={onDescriptionChange}
            rows={3}
            maxLength={100}
        />
    </div>
)

export default QuoteForm
