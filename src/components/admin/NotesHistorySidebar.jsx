import React, { useState } from 'react';
import { useGymState } from '../../context/GymStateContext';
import { FileText, Plus, Search, Calendar, ChevronDown, Check, X } from 'lucide-react';

export default function NotesHistorySidebar() {
  const { activeClient, addNote } = useGymState();

  const [noteSearch, setNoteSearch] = useState('');
  const [signinSearch, setSigninSearch] = useState('');

  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');

  if (!activeClient) return null;

  // Filter Notes
  const filteredNotes = activeClient.notes.filter(note =>
    note.text.toLowerCase().includes(noteSearch.toLowerCase()) ||
    note.date.toLowerCase().includes(noteSearch.toLowerCase())
  );

  // Filter Signins
  const filteredSignins = activeClient.signinHistory.filter(sig =>
    sig.date.toLowerCase().includes(signinSearch.toLowerCase())
  );

  const handleAddNoteSubmit = () => {
    if (newNoteText.trim()) {
      addNote(activeClient.id, newNoteText.trim());
      setNewNoteText('');
      setIsAddingNote(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Notes Panel */}
      <div className="bg-white rounded-3xl p-6 shadow-premium border border-gray-100 flex flex-col max-h-[480px]">
        {/* Notes Header */}
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-sm font-extrabold text-gray-800 tracking-wide flex items-center gap-1.5">
            <span className="w-1.5 h-3.5 bg-[#00af87] rounded-sm"></span>
            Notes
          </h4>
          {!isAddingNote ? (
            <button
              onClick={() => setIsAddingNote(true)}
              className="text-[11px] font-bold text-[#00af87] hover:opacity-85 flex items-center gap-0.5"
            >
              <Plus size={12} /> New Note
            </button>
          ) : (
            <button
              onClick={() => setIsAddingNote(false)}
              className="text-[11px] font-bold text-red-500 flex items-center gap-0.5"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Search Notes Bar */}
        <div className="relative mb-4">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search notes..."
            value={noteSearch}
            onChange={(e) => setNoteSearch(e.target.value)}
            className="w-full bg-gray-50/70 border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:border-[#00af87] text-gray-700 font-medium"
          />
        </div>

        {/* Add Note Input Area */}
        {isAddingNote && (
          <div className="mb-4 p-3 bg-teal-50/20 border border-dashed border-[#00af87]/30 rounded-2xl flex flex-col gap-2">
            <textarea
              placeholder="Type client progress note..."
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              rows={3}
              className="w-full text-xs bg-white border border-gray-100 rounded-xl p-2 outline-none focus:border-[#00af87] text-gray-700 resize-none font-medium"
            />
            <div className="flex justify-end gap-1.5">
              <button
                onClick={handleAddNoteSubmit}
                className="bg-[#00af87] text-white p-1 rounded-md text-[10px] font-bold px-2.5 flex items-center gap-0.5"
              >
                <Check size={11} /> Save
              </button>
            </div>
          </div>
        )}

        {/* Notes Logs list */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {filteredNotes.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">No matching notes found.</p>
          ) : (
            filteredNotes.map((note) => (
              <div key={note.id} className="border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                <span className="text-[10px] text-gray-400 font-bold block mb-1 flex items-center gap-1 uppercase tracking-wide">
                  <Calendar size={10} className="text-[#00af87]" />
                  {note.date}
                </span>
                <p className="text-xs text-gray-600 leading-relaxed font-medium">
                  {note.text}
                </p>
              </div>
            ))
          )}
        </div>

        <button className="mt-4 pt-3 border-t border-gray-50 text-[10px] font-extrabold text-gray-400 hover:text-[#00af87] text-center w-full uppercase tracking-wider">
          View More Notes
        </button>
      </div>

      {/* Sign-in History Panel */}
      <div className="bg-white rounded-3xl p-6 shadow-premium border border-gray-100 flex flex-col max-h-[350px]">
        {/* Sign-in Header */}
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-sm font-extrabold text-gray-800 tracking-wide flex items-center gap-1.5">
            <span className="w-1.5 h-3.5 bg-[#00af87] rounded-sm"></span>
            Sign-in
          </h4>
          <span className="text-[10px] font-extrabold text-gray-400 tracking-wider cursor-pointer uppercase">View All</span>
        </div>

        {/* Search Sign-ins Bar */}
        <div className="relative mb-4">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search dates..."
            value={signinSearch}
            onChange={(e) => setSigninSearch(e.target.value)}
            className="w-full bg-gray-50/70 border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:border-[#00af87] text-gray-700 font-medium"
          />
        </div>

        {/* Sign-in List */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
          {filteredSignins.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">No matching sign-ins found.</p>
          ) : (
            filteredSignins.map((sig) => (
              <div key={sig.id} className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2 text-gray-500">
                  <Calendar size={13} className="text-[#00af87]/60" />
                  <span>{sig.date}</span>
                </div>
                <span className="font-serif italic text-gray-600 text-sm tracking-wide">{sig.signature}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
