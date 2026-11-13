// Popular books used for free "test mode" tips (no AI). Real tips come from Claude.

export const MOCK_BUY_LIST: {
  title: string;
  author: string;
  genres: string[];
  moods: string[];
  blurb: string;
}[] = [
  { title: 'Fourth Wing', author: 'Rebecca Yarros', genres: ['Romantasy', 'Fantasy', 'Spicy'], moods: ['epic', 'spicy', 'tense'], blurb: 'Dragons, a deadly war college and an enemies-to-lovers slow burn.' },
  { title: 'A Court of Thorns and Roses', author: 'Sarah J. Maas', genres: ['Romantasy', 'Fantasy', 'Spicy'], moods: ['epic', 'swoony', 'spicy'], blurb: 'Faerie courts, a cursed High Lord and a heroine who keeps surprising you.' },
  { title: 'House of Earth and Blood', author: 'Sarah J. Maas', genres: ['Romantasy', 'Fantasy'], moods: ['epic', 'tense'], blurb: 'A murder mystery in a modern city full of angels, shifters and fae.' },
  { title: 'Throne of Glass', author: 'Sarah J. Maas', genres: ['Fantasy', 'Romantasy'], moods: ['epic'], blurb: 'An assassin fights for her freedom in a deadly royal competition.' },
  { title: 'The Serpent and the Wings of Night', author: 'Carissa Broadbent', genres: ['Romantasy', 'Fantasy', 'Spicy'], moods: ['epic', 'tense', 'spicy'], blurb: 'A human raised by vampires enters a brutal tournament.' },
  { title: 'From Blood and Ash', author: 'Jennifer L. Armentrout', genres: ['Romantasy', 'Fantasy', 'Spicy'], moods: ['swoony', 'spicy', 'epic'], blurb: 'A chosen Maiden, a forbidden guard and twists you will not see coming.' },
  { title: 'Quicksilver', author: 'Callie Hart', genres: ['Romantasy', 'Fantasy', 'Spicy'], moods: ['spicy', 'epic'], blurb: 'A thief, a fae warrior and a frozen, dangerous world.' },
  { title: 'The Cruel Prince', author: 'Holly Black', genres: ['Fantasy', 'Romantasy', 'Young adult'], moods: ['tense', 'epic'], blurb: 'A mortal girl schemes her way through a vicious faerie court.' },
  { title: 'Things We Never Got Over', author: 'Lucy Score', genres: ['Romance', 'Spicy'], moods: ['swoony', 'light', 'spicy'], blurb: 'Grumpy barber meets runaway bride in a small town with big hearts.' },
  { title: 'Things We Hide from the Light', author: 'Lucy Score', genres: ['Romance', 'Spicy'], moods: ['swoony', 'spicy'], blurb: 'Back in Knockemout, with the chief of police and his softer side.' },
  { title: 'The Love Hypothesis', author: 'Ali Hazelwood', genres: ['Romance'], moods: ['light', 'swoony'], blurb: 'A fake-dating scheme in a science lab, funny and sweet.' },
  { title: 'Love, Theoretically', author: 'Ali Hazelwood', genres: ['Romance'], moods: ['light', 'swoony'], blurb: 'Rival physicists, a fake relationship and lots of banter.' },
  { title: 'Bride', author: 'Ali Hazelwood', genres: ['Romantasy', 'Romance', 'Spicy'], moods: ['spicy', 'swoony'], blurb: 'A vampire marries a werewolf in a deliciously steamy alliance.' },
  { title: 'It Ends with Us', author: 'Colleen Hoover', genres: ['Romance', 'Fiction'], moods: ['cry'], blurb: 'A love story that turns into something much harder, and braver.' },
  { title: 'Verity', author: 'Colleen Hoover', genres: ['Thriller', 'Romance'], moods: ['tense', 'quick'], blurb: 'A ghostwriter finds a manuscript that should never have been read.' },
  { title: 'Reminders of Him', author: 'Colleen Hoover', genres: ['Romance', 'Fiction'], moods: ['cry', 'swoony'], blurb: 'A mother fights to be part of her daughter’s life again.' },
  { title: 'Book Lovers', author: 'Emily Henry', genres: ['Romance'], moods: ['light', 'swoony'], blurb: 'A cut-throat literary agent and a brooding editor in a small town.' },
  { title: 'Funny Story', author: 'Emily Henry', genres: ['Romance'], moods: ['light', 'swoony'], blurb: 'Two dumped exes fake a summer romance, with lots of heart.' },
  { title: 'The Silent Patient', author: 'Alex Michaelides', genres: ['Thriller', 'Mystery'], moods: ['tense', 'quick'], blurb: 'A woman shoots her husband and never speaks again, until now.' },
  { title: 'The Housemaid', author: 'Freida McFadden', genres: ['Thriller'], moods: ['tense', 'quick'], blurb: 'A live-in maid discovers her perfect employers are anything but.' },
  { title: 'Gone Girl', author: 'Gillian Flynn', genres: ['Thriller', 'Mystery'], moods: ['tense'], blurb: 'A missing wife and a husband who is not telling the truth.' },
  { title: 'The Seven Husbands of Evelyn Hugo', author: 'Taylor Jenkins Reid', genres: ['Fiction', 'Romance', 'Historical'], moods: ['cry', 'swoony'], blurb: 'An old Hollywood icon finally tells the story of her life and great love.' },
  { title: 'Haunting Adeline', author: 'H. D. Carlton', genres: ['Romance', 'Spicy', 'Thriller'], moods: ['spicy', 'tense'], blurb: 'Very dark and very spicy: a stalker romance (check the warnings!).' },
  { title: 'Icebreaker', author: 'Hannah Grace', genres: ['Romance', 'Spicy'], moods: ['swoony', 'spicy', 'light'], blurb: 'A figure skater and a hockey captain forced to share the ice.' },
  { title: 'The Ex Hex', author: 'Erin Sterling', genres: ['Romantasy', 'Romance'], moods: ['light', 'swoony'], blurb: 'A witch’s drunken curse on her ex comes back to bite her. Cosy and funny.' },
  { title: 'A Deadly Education', author: 'Naomi Novik', genres: ['Fantasy'], moods: ['epic', 'tense'], blurb: 'A magic school where the school itself tries to eat its students.' },
  { title: 'Six of Crows', author: 'Leigh Bardugo', genres: ['Fantasy', 'Young adult'], moods: ['epic', 'tense'], blurb: 'A crew of misfits attempts an impossible heist.' },
  { title: 'Iron Flame', author: 'Rebecca Yarros', genres: ['Romantasy', 'Fantasy', 'Spicy'], moods: ['epic', 'tense'], blurb: 'The second Empyrean book: higher stakes, more dragons.' },
  { title: 'Powerless', author: 'Lauren Roberts', genres: ['Romantasy', 'Young adult'], moods: ['swoony', 'tense'], blurb: 'An ordinary girl hides among the powerful in deadly trials.' },
  { title: 'Lessons in Chemistry', author: 'Bonnie Garmus', genres: ['Fiction', 'Historical'], moods: ['light', 'cry'], blurb: 'A brilliant chemist becomes a TV cooking star in the 1960s.' },
];
