# BLTopScorers
Displays image and stats of the winner of the Torjägerkanone (Bundesliga top scorer) for a given season

## Project Requirements:
- Use 2 REST APIs *synchronously* The call to the second must depend on the response from the first.
- At least 1 API must have authentication 
- Promises, async/await, and setTimeout are banned

## Features
- User inputs a season (year)
- FootballAPI is called and obtains the name and stats for the Bundesliga's top scorer for that year
- imsea API is called and obtains an image of that player
- Displays both to the user after the second call is complete
