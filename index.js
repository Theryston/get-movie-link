const axios = require('axios');
const puppeteer = require('puppeteer');
const Loading = require('loading-cli');
const PrismaClient = require('@prisma/client').PrismaClient;

require('dotenv').config();

const loading = new Loading({
  color: 'yellow',
});

const API_KEY = process.env.API_KEY;

const prisma = new PrismaClient();

let moviePage = 1;
let totalPages = 9999;

const main = async () => {
  loading.start('Initializing the browser...');
  const browser = await puppeteer.launch({
    headless: false,
  });
  const page = await browser.newPage();
  loading.succeed('Browser initialized!');

  while (moviePage <= totalPages) {
    const movies = await findMovies();

    for (let i = 0; i < movies.length; i++) {
      const movie = movies[i];

      const movieAlreadyExists = await prisma.movie.findFirst({
        where: {
          tmdb_id: movie.id
        }
      });

      if (movieAlreadyExists) {
        loading.info(`Movie ${movie.title} already exists!`);
        continue;
      }

      const errorOnMovie = await prisma.error.findFirst({
        where: {
          type: 'MOVIE',
          util: movie.id.toString()
        }
      });

      if (errorOnMovie) {
        loading.fail(`Movie ${movie.title} already has an error!`);
        continue;
      }

      try {
        loading.start(`Opening movie page ${movie.title}...`);
        await page.goto(`https://openvideosource.xyz/theplayer.php?type=movie&tmdb=${movie.id}`)
        await page.waitForSelector('.selectAudioButton', {
          timeout: 500,
        });
        loading.succeed(`Movie page ${movie.title} opened!`);
      } catch (e) {
        await handleError({
          type: 'MOVIE',
          util: movie.id.toString(),
          message: `Error opening movie page ${movie.title} | Details: ${JSON.stringify(e)}`,
        });
        continue;
      }
      loading.start(`Searching for audio tracks on movie page ${movie.title}...`);
      let videos = [];
      try {
        videos = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('.selectAudioButton')).filter(e => e.innerText).map(e => ({
            code: new URL(e.querySelector('a').href).searchParams.get('code'),
            audioType: e.innerText
          }))
        });
        if (!videos.length) {
          await handleError({
            type: 'MOVIE',
            util: movie.id.toString(),
            message: `No audio tracks found on movie page ${movie.title}!`,
          })
          continue;
        }
        loading.succeed(`Found ${videos.length} audio tracks on movie page ${movie.title}!`);
      } catch (e) {
        await handleError({
          type: 'MOVIE',
          util: movie.id.toString(),
          message: `Error searching for audio tracks on movie page ${movie.title} | Details: ${JSON.stringify(e)}`,
        })
        continue;
      }
      for (let j = 0; j < videos.length; j++) {
        loading.start(`Getting video ${videos[j].audioType} on movie page ${movie.title}...`);
        let url;
        try {
          await page.goto(`https://openvideosource.xyz/playfile2.php/?code=${videos[j].code}&server=openvideo&type=movie`);
          await page.waitForSelector('video');
          url = await page.evaluate(() => {
            return document.querySelector('video').src;
          });
          const videoAlreadyExists = await prisma.video.findUnique({
            where: {
              url,
            }
          });
          if (videoAlreadyExists) {
            loading.info(`Video ${videos[j].audioType} already exists!`);
            continue;
          }

          const errorOnVideo = await prisma.error.findFirst({
            where: {
              type: 'VIDEO',
              util: url,
            }
          });

          if (errorOnVideo) {
            loading.fail(`Video ${videos[j].audioType} already has an error!`);
            continue;
          }

          if (!url) {
            await handleError({
              type: 'VIDEO',
              util: url,
              message: `Error getting video ${videos[j].audioType} on movie page ${movie.title} | Details: ${JSON.stringify(e)}`,
            })
            continue;
          }
          videos[j].url = url;
          loading.succeed(`Got video ${videos[j].audioType} on movie page ${movie.title}!`);
        } catch (e) {
          await handleError({
            type: 'VIDEO',
            util: url,
            message: `Error getting video ${videos[j].audioType} on movie page ${movie.title} | Details: ${JSON.stringify(e)}`,
          });
          continue;
        }
      }
      loading.start(`Creating movie ${movie.title} on database...`);

      let dbCreatedMovie;
      try {
        dbCreatedMovie = await prisma.movie.create({
          data: {
            title: movie.title,
            tmdb_id: movie.id,
          }
        })
      } catch (e) {
        loading.fail(`Error creating movie ${movie.title} on database | Details: ${JSON.stringify(e)}`);
        continue;
      }
      loading.succeed(`Movie ${movie.title} created on database!`);
      loading.start(`Creating videos on database...`);
      try {
        for (const video of videos) {
          await prisma.video.create({
            data: {
              url: video.url,
              audio_type: video.audioType,
              movie: {
                connect: {
                  id: dbCreatedMovie.id,
                }
              }
            }
          })
        }
      } catch (e) {
        loading.fail(`Error creating videos on database | Details: ${JSON.stringify(e)}`);
        continue;
      }
    }
  }
};

const handleError = async (data) => {
  await prisma.error.create({
    data
  });
  loading.fail(data.message);
}

const findMovies = async () => {
  try {
    loading.start(`Finding movies on page ${moviePage}...`);
    const response = await axios.get(`https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&language=en-US&sort_by=popularity.desc&include_adult=false&include_video=false&page=${moviePage}`);
    totalPages = response.data.total_pages;
    moviePage++;
    const movies = response.data.results;
    loading.succeed(`Found ${movies.length} movies on page ${moviePage - 1}!`);
    return movies;
  } catch (e) {
    loading.fail(`Error finding movies | Details: ${JSON.stringify(e)}`);
  }
};

main();