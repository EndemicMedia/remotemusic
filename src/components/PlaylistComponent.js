import React, { useState, useEffect } from 'react';
import { FaSort, FaSortAlphaDown, FaSortAlphaUp, FaCalendarAlt } from 'react-icons/fa';

const PlaylistComponent = ({ songs, onSongSelect }) => {
  const [sortCriteria, setSortCriteria] = useState('alphabetical');
  const [sortOrder, setSortOrder] = useState('ascending');

  const sortedSongs = [...songs].sort((a, b) => {
    if (sortCriteria === 'alphabetical') {
      return sortOrder === 'ascending' ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title);
    } else {
      return sortOrder === 'ascending' ? a.creationDate - b.creationDate : b.creationDate - a.creationDate;
    }
  });

  const toggleSortCriteria = () => {
    setSortCriteria(prev => prev === 'alphabetical' ? 'date' : 'alphabetical');
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'ascending' ? 'descending' : 'ascending');
  };

  return (
    <div className="playlist-container">
      <div className="sort-controls">
        <button onClick={toggleSortCriteria}>
          {sortCriteria === 'alphabetical' ? <FaSortAlphaDown /> : <FaCalendarAlt />}
          {sortCriteria === 'alphabetical' ? 'Alphabetical' : 'Date'}
        </button>
        <button onClick={toggleSortOrder}>
          <FaSort />
          {sortOrder === 'ascending' ? 'Ascending' : 'Descending'}
        </button>
      </div>
      <ul className="song-list">
        {sortedSongs.map((song, index) => (
          <li key={index} onClick={() => onSongSelect(song)}>
            {song.title}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PlaylistComponent;