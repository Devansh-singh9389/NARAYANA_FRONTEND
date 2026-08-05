// The base URL for your FastAPI backend
const API_BASE_URL = 'http://127.0.0.1:8000/api';

export const fetchHistoryApi = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/comics`);
    if (!response.ok) throw new Error("Failed to fetch history");
    const data = await response.json();
    return data.comics || [];
  } catch (error) {
    console.error("API Error (fetchHistory):", error);
    return []; 
  }
};

export const deleteStoryApi = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/comics/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error("Failed to delete story");
    return await response.json();
  } catch (error) {
    console.error("API Error (deleteStory):", error);
    return { success: false };
  }
};

export const fetchComicByIdApi = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/comics/${id}`);
    if (!response.ok) throw new Error("Comic not found");
    return await response.json();
  } catch (error) {
    console.error("API Error (fetchComicById):", error);
    return null;
  }
};

export const generateStoryApi = async (prompt, mode, sceneCount = 0) => {
  try {
    const response = await fetch(`${API_BASE_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ topic: prompt, mode: mode, num_scenes: sceneCount }), 
    });
    
    if (!response.ok) throw new Error("Failed to generate story");
    return await response.json();
  } catch (error) {
    console.error("API Error (generateStory):", error);
    throw error;
  }
};

export const pauseStoryApi = async (id) => {
  await fetch(`${API_BASE_URL}/comics/${id}/pause`, { method: 'POST' });
};

export const resumeStoryApi = async (id) => {
  await fetch(`${API_BASE_URL}/comics/${id}/resume`, { method: 'POST' });
};

// --- NEW: Regenerate Thumbnail API ---
export const regenerateThumbnailApi = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/comics/${id}/thumbnail`, { method: 'POST' });
    if (!response.ok) throw new Error("Failed to regenerate thumbnail");
    return await response.json();
  } catch (error) {
    console.error("API Error (regenerateThumbnail):", error);
    throw error;
  }
};