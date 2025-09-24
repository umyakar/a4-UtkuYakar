import React, { useState, useEffect } from 'react';
import PlantForm from './components/PlantForm';
import PlantList from './components/PlantList';
import Login from './components/Login';
import { whoAmI, logout } from './api';

export default function App() {
  const [user, setUser] = useState(null);
  const [plants, setPlants] = useState([]);
  const [editingPlant, setEditingPlant] = useState(null);

  // check if user is logged in on mount
  useEffect(() => {
    async function checkUser() {
      const userData = await whoAmI();
      if (userData) {
        setUser(userData);
        fetchPlants();
      }
    }
    checkUser();
  }, []);

  const fetchPlants = async () => {
    try {
      const res = await fetch('/api/items');
      const data = await res.json();
      if (res.ok) {
        setPlants(data.items || []);
      }
    } catch (error) {
      console.error('Failed to fetch plants:', error);
    }
  };

  const handleLoginSuccess = async (loggedInUser) => {
    setUser(loggedInUser);
    await fetchPlants();
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setPlants([]);
  };

  const handleSavePlant = async () => {
    await fetchPlants();
    setEditingPlant(null); // clear editing state after save
  };
  
  const startEdit = (plant) => {
    setEditingPlant(plant);
    // scrolling the form for better mobile ux, otherwise it's annoying to see the form
    document.getElementById('add')?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const cancelEdit = () => {
    setEditingPlant(null);
  }

  // If no user, show login
  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // If user is logged in, show main app
  return (
    <>
      <header className="container-fluid site-header">
        <nav>
          <ul>
            <li><strong>Plant Pal 🌱</strong></li>
          </ul>
          <ul>
            <li><a href="#add">Add Plant</a></li>
            <li><a href="#all">All Plants</a></li>
            <li><button onClick={handleLogout} className="secondary">Logout</button></li>
          </ul>
        </nav>
        <p className="muted">Welcome, {user.username}! Track plants, water on time!</p>
      </header>

      <main className="container-fluid">
        <div className="app-grid">
          <PlantForm 
            editingPlant={editingPlant} 
            onSave={handleSavePlant}
            onCancelEdit={cancelEdit}
          />
          <PlantList
            plants={plants}
            onEdit={startEdit}
            onDelete={fetchPlants} // re-fetch plants after del
          />
        </div>
      </main>
      
      <footer className="container-fluid site-footer">
        <small>CS4241 A4 - React - Utku Yakar</small>
      </footer>
    </>
  );
}

