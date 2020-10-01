package main

import (
    "context"
    "github.com/go-redis/redis/v8"
    "github.com/gofiber/fiber/v2"
    "strings"
    "sync"
)

var mutex = &sync.Mutex{}
var ctx = context.Background()

var globalcjar = make(map[string]string)
var ipmap = make(map[string]string)

func main() {
	app := fiber.New()

     rdb := redis.NewClient(&redis.Options{
                Addr:     "localhost:6379",
                Password: "", // no password set
                DB:       0,  // use default DB
            })

    app.Get("/loaderio-857b69799d18a123155aa2fd40fe02ed", func(c *fiber.Ctx) error{
        return c.SendString("loaderio-857b69799d18a123155aa2fd40fe02ed")
    })

    app.Post("/map", func(c *fiber.Ctx) error{
        originip := strings.Replace(c.Get("origin-ip"), ".", "", -1)
        if len(originip) == 0 {
            originip = strings.Replace(c.IP(), ".", "", -1)
           }
        filever := c.Get("fileversion")
            mutex.Lock()
            ipmap[originip] = filever
            mutex.Unlock()

        return c.SendString("mapped")
    })

	app.Get("/cookies", func(c *fiber.Ctx) error {
	        var response string
	        var ipmapcopy = make(map[string]string)
            mutex.Lock()
	        ipmapcopy = ipmap
	        mutex.Unlock()
            originip := strings.Replace(c.Get("origin-ip"), ".", "", -1)
            if len(originip) == 0 {
                   originip = strings.Replace(c.IP(), ".", "", -1)
            }
            response, err := rdb.Get(ctx, ipmapcopy[originip]).Result()
            if err != nil {
                randomkey := rdb.RandomKey(ctx).Val()
                response, err := rdb.Get(ctx, randomkey).Result()
                if err != nil{
                }
                return c.SendString(response)
            }
            return c.SendString(response)
	})

	app.Listen(":7000")
}