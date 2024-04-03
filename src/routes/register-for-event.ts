import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";
import { prisma } from "../lib/prisma";

export async function registerForEvent(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().post(
        "/events/:eventId/attendees",
        {
            schema: {
                body: z.object({
                    name: z.string().min(4),
                    email: z.string().email(),
                }),
                params: z.object({
                    eventId: z.string().uuid(),
                }),
                response: {
                    201: z.object({
                        attendeeId: z.number(),
                    }),
                },
            },
        },
        async (req, reply) => {
            const { eventId } = req.params;
            const { email, name } = req.body;

            const findAttendeeByEmailAndEventId = await prisma.attendee.findUnique({
                where: {
                    eventId_email: {
                        email,
                        eventId,
                    },
                },
            });

            if (findAttendeeByEmailAndEventId !== null) {
                throw new Error("This email is already registered for this event");
            }

            const [event, amountOfAttendeeForEvent] = await Promise.all([
                prisma.event.findUnique({
                    where: { id: eventId },
                }),
                prisma.attendee.count({
                    where: { eventId },
                }),
            ]);

            if (event?.maximumAttendees && amountOfAttendeeForEvent >= event.maximumAttendees) {
                throw new Error("This event is full");
            }

            const attendee = await prisma.attendee.create({
                data: { name, email, eventId },
            });

            return reply.status(201).send({ attendeeId: attendee.id });
        }
    );
}
