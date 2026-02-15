// Migration Guide: From Static JSON to Dynamic API

/*
STEP 1: Set up Supabase
1. Go to https://supabase.com
2. Create a new project
3. Get your project URL and API keys

STEP 2: Configure Environment Variables
1. Copy .env.example to .env.local in your Backend folder
2. Fill in your Supabase credentials:
   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_key

STEP 3: Set up Database
1. Go to Supabase SQL Editor
2. Run the script in Backend/supabase/seed/seed-data.sql

STEP 4: Update Frontend Code
Replace the fetch logic in your homepage with API calls:

OLD CODE (static JSON):
*/
/*
useEffect(() => {
  const fetchData = async () => {
    const [heroSlidesRes] = await Promise.all([
      fetch('/data/hero-slider.json')
    ]);
    const [heroSlidesData] = await Promise.all([
      heroSlidesRes.json()
    ]);
    setHeroSlides(heroSlidesData);
  };
  fetchData();
}, []);
*/

/*
NEW CODE (dynamic API):
*/
/*
useEffect(() => {
  const fetchHeroSlides = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/hero-slides');
      const result = await response.json();
      
      if (result.success) {
        // Transform API response to match existing format
        const slides = result.data.map((slide: any) => ({
          id: slide.id,
          imageUrl: slide.image_url,
          title: slide.title,
          subtitle: slide.subtitle
        }));
        setHeroSlides(slides);
      } else {
        setError(result.error || 'Failed to load hero slides');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error fetching hero slides:', err);
    } finally {
      setLoading(false);
    }
  };

  fetchHeroSlides();
}, []);
*/

// STEP 5: Test the Integration
// 1. Start your backend: cd Backend && npm run dev
// 2. Start your frontend: cd ecommerce-ap1 && npm run dev
// 3. Visit your homepage to see dynamic hero slides

// STEP 6: Admin Panel (Optional)
// You can now create a simple admin panel to manage hero slides:
// - Add new slides
// - Edit existing slides
// - Reorder slides
// - Toggle active/inactive status