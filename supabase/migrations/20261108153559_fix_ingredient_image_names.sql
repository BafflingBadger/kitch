-- Point six keywords at images the iOS app actually has.
--
-- The seed in 20261108145435_ingredient_keywords copied the old hard-coded iOS
-- map, which named assets that don't exist in Assets.xcassets/Ingredient Icons,
-- so these keywords have always shown "unknown" on iOS. Every target below is an
-- existing asset, so this needs no iOS release.
--
-- "cranberries" has no image of its own; "cherries" is the closest red berry.

update public.ingredient_keywords as k
set image_name = v.image_name,
    updated_at = now()
from (values
  ('canned item',  'generic can'),
  ('packet item',  'generic packet'),
  ('bottled item', 'generic bottle'),
  ('hotdog buns',  'hotdog bun'),
  ('octopus',      'octopous'),
  ('cranberries',  'cherries')
) as v (keyword, image_name)
where k.keyword = v.keyword;
