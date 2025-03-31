import { useState } from "react";

const NameList = ({ initialNames }) => {
  const [names, setNames] = useState(
    Object.entries(initialNames).map(([socketId, name]) => ({ socketId, name }))
  );

  const removeName = (socketId) => {
    setNames(names.filter((name) => name.socketId !== socketId));
  };

  return (
    <div className="p-4 bg-gray-100 rounded-lg shadow-md w-80">
      <h2 className="text-lg font-bold mb-2">Name List</h2>
      <ul className="space-y-2">
        {names.map(({ name, socketId }) => (
          <li key={socketId} className="flex justify-between items-center bg-black p-2 rounded-md shadow">
            <span>{name}</span>
            <button 
              onClick={() => removeName(socketId)} 
              className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600">
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default NameList;