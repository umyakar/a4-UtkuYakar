import React from 'react';
import PlantRow from './PlantRow';

// Display the list of plants as a table
export default function PlantList({ plants, onEdit, onDelete }) {
  return (
    <article id="all" className="card">
      <h3>Your Plants</h3>
      {plants.length === 0 ? (
        <p className="muted">No plants yet — add one!</p>
      ) : (
        <div className="table-wrap">
          <table aria-describedby="results-caption">
            <caption id="results-caption" className="sr-only">Plants table</caption>
            <colgroup>
              <col style={{width: '12%'}} /><col style={{width: '12%'}} /><col style={{width: '11%'}} />
              <col style={{width: '8%'}} /><col style={{width: '11%'}} /><col style={{width: '8%'}} />
              <col style={{width: '9%'}} /><col style={{width: '7%'}} /><col style={{width: 'auto'}} /><col style={{width: '9%'}} />
            </colgroup>
            <thead>
              <tr>
                <th>Name</th><th>Species</th><th>Last Watered</th><th>Interval</th>
                <th>Next Water</th><th>Status</th><th>Sunlight</th><th>Indoors</th><th>Notes</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {plants.map(plant => (
                <PlantRow
                  key={plant._id}
                  plant={plant}
                  onEdit={() => onEdit(plant)}
                  onDelete={() => onDelete(plant._id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}

