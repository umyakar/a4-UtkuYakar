import React, { useState, useEffect } from 'react';

// Helper to format date for input
const formatDateForInput = (dateStr) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toISOString().split('T')[0];
  } catch {
    return '';
  }
};

const initialFormState = {
  name: '',
  species: '',
  lastWatered: '',
  intervalDays: '7',
  sunlight: 'medium',
  indoors: true,
  notes: '',
};

export default function PlantForm({ editingPlant, onSave, onCancelEdit }) {
  const [formData, setFormData] = useState(initialFormState);
  const [error, setError] = useState('');
  
  // When editingplant prop changes, update the form
  useEffect(() => {
    if (editingPlant) {
      setFormData({
        ...initialFormState,
        ...editingPlant,
        lastWatered: formatDateForInput(editingPlant.lastWatered),
      });
    } else {
      setFormData(initialFormState);
    }
  }, [editingPlant]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.lastWatered || !formData.intervalDays) {
      setError('Please fill in all required fields.');
      return;
    }
    
    const id = editingPlant?._id;
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/items/${id}` : '/api/items';
    
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      
      setFormData(initialFormState); // reset the form
      onSave(); // send notification to parent
      
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <article id="add" className="card">
      <h3>{editingPlant ? 'Edit Plant' : 'Add a Plant'}</h3>
      <form onSubmit={handleSubmit} noValidate>
        {/* Input fields */}
        <div className="grid grid-2">
          <label>
            Name *
            <input name="name" type="text" required maxLength="100" placeholder="Monstera" value={formData.name} onChange={handleChange} />
          </label>
          <label>
            Species
            <input name="species" type="text" maxLength="100" placeholder="Monstera deliciosa" value={formData.species} onChange={handleChange} />
          </label>
        </div>
        <div className="grid grid-2">
          <label>
            Last watered *
            <input name="lastWatered" type="date" required value={formData.lastWatered} onChange={handleChange} />
          </label>
          <label>
            Interval (days) *
            <input name="intervalDays" type="number" min="1" step="1" required placeholder="7" value={formData.intervalDays} onChange={handleChange} />
          </label>
        </div>
        <div className="grid grid-2">
          <label>
            Sunlight
            <select name="sunlight" value={formData.sunlight} onChange={handleChange}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <fieldset>
            <legend>Location</legend>
            <label>
              <input type="checkbox" name="indoors" checked={formData.indoors} onChange={handleChange} />
              Indoors
            </label>
          </fieldset>
        </div>
        <label>
          Notes
          <textarea name="notes" rows="3" placeholder="watering tricks, pests, etc." value={formData.notes} onChange={handleChange}></textarea>
        </label>

        {/* Action buttons */}
        <footer className="grid grid-2">
          <button className="contrast" type="submit">{editingPlant ? 'Update' : 'Save'}</button>
          {editingPlant && (
            <button type="button" className="secondary" onClick={onCancelEdit}>Cancel edit</button>
          )}
        </footer>
        {error && <p className="error" aria-live="polite">{error}</p>}
      </form>
    </article>
  );
}

