# Get Movie Link

This is a robot that fetches direct links to you from movies. It extracts the data from the website [https://openvideosource.xyz](https://openvideosource.xyz)

## Installation

Clone the repository, create a file called `.env` in the project root and place the following content:

```env
API_KEY=YOUR_API_KEY
```

Replace `YOUR_API_KEY` with [your API Key from The Movie Database website](https://www.themoviedb.org/settings/api)

Install all dependencies running the following command:

```bash
pnpm install
```

running:

```bash
pnpm start
```

Leave it running!

## Already Indexed

The films already indexed are together with the repository, this means that you don't need to leave it running and wait until the process is finished, because sefrentemente the collaborators of this project leave it running and upload to the repository an updated list of films that have been indexed, for both when you clone you will have access to these movies, just follow the part on how to [see the results](#see-results) to see the movies already indexed

## See Results

To see what data was collected open in a new tab in the terminal and run:

```bash
pnpm prisma studio
```

This will make the prisma raise a server with a data manager and it will open in your browser. In your browser select the `movie` model and you will see all the movies indexed, you can also see the direct links of these movies in the videos column and there will be all the supported videos (subtitled, dubbed...)
