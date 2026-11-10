export interface PlaceSuggestion {
  id: string;
  description: string;
}

export const fetchAddressSuggestions = async (query: string): Promise<PlaceSuggestion[]> => {
  if (!query || query.length < 3) return [];
  
  try {
    const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || '',
      },
      body: JSON.stringify({
        input: query,
        languageCode: 'fr',
      })
    });
    
    const data = await response.json();
    
    if (data.suggestions) {
      return data.suggestions.map((s: any) => ({
        id: s.placePrediction.placeId,
        description: s.placePrediction.text.text,
      }));
    }
    return [];
  } catch (error) {
    console.error('Erreur API Google Places:', error);
    return [];
  }
};