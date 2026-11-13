// Popular books for "something new" in free test mode. Each has genres, moods, traits and a
// spice level (0–5), so the taste engine can match them to her. Real tips come from Claude.

export const MOCK_BUY_LIST: {
  title: string;
  author: string;
  genres: string[];
  moods: string[];
  traits: string[];
  spice: number;
  blurb: string;
}[] = [
  { title: 'Fourth Wing', author: 'Rebecca Yarros', genres: ['Romantasy', 'Fantasy', 'Spicy'], moods: ['epic', 'spicy', 'tense'], traits: ['dragons', 'magic school', 'enemies to lovers', 'banter', 'fast pace', 'spice'], spice: 3, blurb: 'Dragons, a deadly war college and an enemies-to-lovers slow burn.' },
  { title: 'A Court of Thorns and Roses', author: 'Sarah J. Maas', genres: ['Romantasy', 'Fantasy', 'Spicy'], moods: ['epic', 'swoony', 'spicy'], traits: ['fae', 'enemies to lovers', 'morally grey', 'spice'], spice: 3, blurb: 'Faerie courts, a cursed High Lord and a heroine who keeps surprising you.' },
  { title: 'House of Earth and Blood', author: 'Sarah J. Maas', genres: ['Romantasy', 'Fantasy'], moods: ['epic', 'tense'], traits: ['fae', 'plot twists', 'found family', 'banter', 'spice'], spice: 3, blurb: 'A murder mystery in a modern city full of angels, shifters and fae.' },
  { title: 'Throne of Glass', author: 'Sarah J. Maas', genres: ['Fantasy', 'Romantasy', 'Young adult'], moods: ['epic'], traits: ['fae', 'plot twists', 'found family', 'love triangle'], spice: 1, blurb: 'An assassin fights for her freedom in a deadly royal competition.' },
  { title: 'The Serpent and the Wings of Night', author: 'Carissa Broadbent', genres: ['Romantasy', 'Fantasy', 'Spicy'], moods: ['epic', 'tense', 'spicy'], traits: ['vampires', 'enemies to lovers', 'slow burn', 'dark', 'spice'], spice: 3, blurb: 'A human raised by vampires enters a brutal tournament.' },
  { title: 'From Blood and Ash', author: 'Jennifer L. Armentrout', genres: ['Romantasy', 'Fantasy', 'Spicy'], moods: ['swoony', 'spicy', 'epic'], traits: ['vampires', 'plot twists', 'banter', 'morally grey', 'spice'], spice: 4, blurb: 'A chosen Maiden, a forbidden guard and twists you will not see coming.' },
  { title: 'Quicksilver', author: 'Callie Hart', genres: ['Romantasy', 'Fantasy', 'Spicy'], moods: ['spicy', 'epic'], traits: ['fae', 'enemies to lovers', 'banter', 'slow burn', 'spice'], spice: 4, blurb: 'A thief, a fae warrior and a frozen, dangerous world.' },
  { title: 'The Cruel Prince', author: 'Holly Black', genres: ['Fantasy', 'Romantasy', 'Young adult'], moods: ['tense', 'epic'], traits: ['fae', 'enemies to lovers', 'morally grey', 'plot twists'], spice: 1, blurb: 'A mortal girl schemes her way through a vicious faerie court.' },
  { title: 'Things We Never Got Over', author: 'Lucy Score', genres: ['Romance', 'Spicy'], moods: ['swoony', 'light', 'spicy'], traits: ['small town', 'grumpy sunshine', 'banter', 'found family', 'spice'], spice: 4, blurb: 'Grumpy barber meets runaway bride in a small town with big hearts.' },
  { title: 'Things We Hide from the Light', author: 'Lucy Score', genres: ['Romance', 'Spicy'], moods: ['swoony', 'spicy'], traits: ['small town', 'grumpy sunshine', 'banter', 'spice'], spice: 4, blurb: 'Back in Knockemout, with the chief of police and his softer side.' },
  { title: 'The Love Hypothesis', author: 'Ali Hazelwood', genres: ['Romance'], moods: ['light', 'swoony'], traits: ['fake dating', 'banter', 'grumpy sunshine'], spice: 2, blurb: 'A fake-dating scheme in a science lab, funny and sweet.' },
  { title: 'Love, Theoretically', author: 'Ali Hazelwood', genres: ['Romance'], moods: ['light', 'swoony'], traits: ['fake dating', 'banter', 'enemies to lovers'], spice: 2, blurb: 'Rival physicists, a fake relationship and lots of banter.' },
  { title: 'Bride', author: 'Ali Hazelwood', genres: ['Romantasy', 'Romance', 'Spicy'], moods: ['spicy', 'swoony'], traits: ['vampires', 'werewolves', 'banter', 'spice'], spice: 4, blurb: 'A vampire marries a werewolf in a deliciously steamy alliance.' },
  { title: 'It Ends with Us', author: 'Colleen Hoover', genres: ['Romance', 'Fiction'], moods: ['cry'], traits: ['emotional', 'dark'], spice: 2, blurb: 'A love story that turns into something much harder, and braver.' },
  { title: 'Verity', author: 'Colleen Hoover', genres: ['Thriller', 'Romance'], moods: ['tense', 'quick'], traits: ['plot twists', 'dark', 'fast pace'], spice: 3, blurb: 'A ghostwriter finds a manuscript that should never have been read.' },
  { title: 'Reminders of Him', author: 'Colleen Hoover', genres: ['Romance', 'Fiction'], moods: ['cry', 'swoony'], traits: ['emotional', 'small town'], spice: 2, blurb: 'A mother fights to be part of her daughter’s life again.' },
  { title: 'Book Lovers', author: 'Emily Henry', genres: ['Romance'], moods: ['light', 'swoony'], traits: ['small town', 'banter', 'grumpy sunshine', 'enemies to lovers'], spice: 2, blurb: 'A cut-throat literary agent and a brooding editor in a small town.' },
  { title: 'Funny Story', author: 'Emily Henry', genres: ['Romance'], moods: ['light', 'swoony'], traits: ['fake dating', 'banter', 'emotional'], spice: 2, blurb: 'Two dumped exes fake a summer romance, with lots of heart.' },
  { title: 'The Silent Patient', author: 'Alex Michaelides', genres: ['Thriller', 'Mystery'], moods: ['tense', 'quick'], traits: ['plot twists', 'dark', 'fast pace'], spice: 0, blurb: 'A woman shoots her husband and never speaks again, until now.' },
  { title: 'The Housemaid', author: 'Freida McFadden', genres: ['Thriller'], moods: ['tense', 'quick'], traits: ['plot twists', 'fast pace', 'dark'], spice: 1, blurb: 'A live-in maid discovers her perfect employers are anything but.' },
  { title: 'Gone Girl', author: 'Gillian Flynn', genres: ['Thriller', 'Mystery'], moods: ['tense'], traits: ['plot twists', 'dark', 'morally grey'], spice: 1, blurb: 'A missing wife and a husband who is not telling the truth.' },
  { title: 'The Seven Husbands of Evelyn Hugo', author: 'Taylor Jenkins Reid', genres: ['Fiction', 'Romance', 'Historical'], moods: ['cry', 'swoony'], traits: ['emotional', 'plot twists'], spice: 1, blurb: 'An old Hollywood icon finally tells the story of her life and great love.' },
  { title: 'Haunting Adeline', author: 'H. D. Carlton', genres: ['Romance', 'Spicy', 'Thriller'], moods: ['spicy', 'tense'], traits: ['dark', 'morally grey', 'spice'], spice: 5, blurb: 'Very dark and very spicy: a stalker romance (check the warnings!).' },
  { title: 'Icebreaker', author: 'Hannah Grace', genres: ['Romance', 'Spicy'], moods: ['swoony', 'spicy', 'light'], traits: ['banter', 'slow burn', 'spice'], spice: 4, blurb: 'A figure skater and a hockey captain forced to share the ice.' },
  { title: 'The Ex Hex', author: 'Erin Sterling', genres: ['Romantasy', 'Romance'], moods: ['light', 'swoony'], traits: ['small town', 'banter', 'spice'], spice: 3, blurb: 'A witch’s drunken curse on her ex comes back to bite her. Cosy and funny.' },
  { title: 'A Deadly Education', author: 'Naomi Novik', genres: ['Fantasy'], moods: ['epic', 'tense'], traits: ['magic school', 'banter', 'dark'], spice: 0, blurb: 'A magic school where the school itself tries to eat its students.' },
  { title: 'Six of Crows', author: 'Leigh Bardugo', genres: ['Fantasy', 'Young adult'], moods: ['epic', 'tense'], traits: ['found family', 'morally grey', 'plot twists', 'banter'], spice: 0, blurb: 'A crew of misfits attempts an impossible heist.' },
  { title: 'Powerless', author: 'Lauren Roberts', genres: ['Romantasy', 'Young adult'], moods: ['swoony', 'tense'], traits: ['enemies to lovers', 'slow burn', 'banter'], spice: 1, blurb: 'An ordinary girl hides among the powerful in deadly trials.' },
  { title: 'Lessons in Chemistry', author: 'Bonnie Garmus', genres: ['Fiction', 'Historical'], moods: ['light', 'cry'], traits: ['banter', 'emotional'], spice: 0, blurb: 'A brilliant chemist becomes a TV cooking star in the 1960s.' },
  { title: 'Divine Rivals', author: 'Rebecca Ross', genres: ['Romantasy', 'Fantasy', 'Young adult'], moods: ['swoony', 'cry'], traits: ['enemies to lovers', 'slow burn', 'emotional'], spice: 1, blurb: 'Rival journalists fall in love through magical letters during a war of gods.' },
  { title: 'The Atlas Six', author: 'Olivie Blake', genres: ['Fantasy'], moods: ['epic', 'tense'], traits: ['magic school', 'morally grey', 'dark'], spice: 2, blurb: 'Six magicians compete for a place in a secret society.' },
  { title: 'Kingdom of the Wicked', author: 'Kerri Maniscalco', genres: ['Romantasy', 'Fantasy', 'Spicy'], moods: ['tense', 'spicy'], traits: ['enemies to lovers', 'slow burn', 'dark', 'spice'], spice: 3, blurb: 'A witch hunts her sister’s killer and makes a deal with a prince of Hell.' },
  { title: 'Credence', author: 'Penelope Douglas', genres: ['Romance', 'Spicy'], moods: ['spicy'], traits: ['dark', 'spice', 'small town'], spice: 5, blurb: 'Isolated in the mountains, with three men and a lot of tension.' },
  { title: 'One of Us Is Lying', author: 'Karen M. McManus', genres: ['Thriller', 'Mystery', 'Young adult'], moods: ['tense', 'quick'], traits: ['plot twists', 'fast pace'], spice: 0, blurb: 'Five students walk into detention; only four walk out.' },
  { title: 'The Spanish Love Deception', author: 'Elena Armas', genres: ['Romance', 'Spicy'], moods: ['light', 'swoony', 'spicy'], traits: ['fake dating', 'enemies to lovers', 'banter', 'slow burn', 'spice'], spice: 3, blurb: 'She needs a date for a wedding in Spain; her annoying colleague volunteers.' },
];
