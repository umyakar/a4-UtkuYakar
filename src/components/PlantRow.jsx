import React from 'react';

// my hepers from old main.js
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + (Number(n) || 0)); return x; };
const stripTime = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const formatDate = (d) => {
  if (!(d instanceof Date) || isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};

const getWateringStatus = (nextWaterDate) => {
  const today = new Date();
  const diff = Math.floor((stripTime(nextWaterDate) - stripTime(today)) / (1000 * 60 * 60 * 24));
  if (diff >= 2) return { label: 'On track', className: 'ok' };
  if (diff >= 0) return { label: 'Water soon', className: 'warn' };
  return { label: 'Overdue', className: 'danger' };
};

const capitalize = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);

export default function PlantRow({ plant, onEdit, onDelete }) {
  
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this plant?')) return;
    try {
      const res = await fetch(`/api/items/${plant._id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      onDelete(); // Refresh the list in parent
    } catch (err) {
      alert(err.message);
    }
  };

  const lastWatered = new Date(plant.lastWatered);
  const nextWater = addDays(lastWatered, plant.intervalDays);
  const status = getWateringStatus(nextWater);

  return (
    <tr>
      <td>{plant.name}</td>
      <td>{plant.species || ''}</td>
      <td>{formatDate(lastWatered)}</td>
      <td>{plant.intervalDays}</td>
      <td>{formatDate(nextWater)}</td>
      <td>
        <span className={`badge ${status.className}`}>{status.label}</span>
      </td>
      <td>{capitalize(plant.sunlight)}</td>
      <td>{plant.indoors ? 'Yes' : 'No'}</td>
      <td>{plant.notes}</td>
      <td className="actions">
        <button type="button" onClick={onEdit}>Edit</button>
        {' '}
        <button type="button" className="secondary" onClick={handleDelete}>Delete</button>
      </td>
    </tr>
  );
}

