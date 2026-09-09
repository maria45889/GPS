import React from 'react';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import MapArea from '../components/MapArea';

const Dashboard = () => {
  return (
    <div className="flex w-full h-full">
      <Sidebar />
      <div className="flex-1 flex flex-col relative h-full">
        <TopBar />
        <main className="flex-1 relative w-full h-full">
          <MapArea />
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
