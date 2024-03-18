import { ThrowableRouter, missing, withParams } from 'itty-router-extras';
import { withDurables, createDurable } from 'itty-durable';

export class Counter extends createDurable({ autoReturn: true }) {
	counter: number;
	constructor(state: any, env: any) {
		super(state, env);

		// anything defined here is only used for initialization (if not loaded from storage)
		this.counter = 0;
	}

	// Because this function does not return anything, it will return the entire contents
	// Example: { counter: 1 }
	increment() {
		this.counter++;
	}

	// Any explicit return will honored, despite the autoReturn flag.
	// Note that any serializable params can passed through from the Worker without issue.
	add(a: number, b: number) {
		return a + b;
	}
}

const router = ThrowableRouter({ base: '/counter' });

router
	// add upstream middleware, allowing Durable access off the request
	.all('*', withDurables())

	// get the durable itself... returns json response, so no need to wrap
	.get('/', ({ Counter }: any) => Counter.get('test').toJSON())

	// By using { autoReturn: true } in createDurable(), this method returns the contents
	.get('/increment', ({ Counter }: any) => Counter.get('test').increment())

	// you can pass any serializable params to a method... (e.g. /counter/add/3/4 => 7)
	.get('/add/:a?/:b?', withParams, ({ Counter, a, b }: any) => Counter.get('test').add(Number(a), Number(b)))

	// reset the durable
	.get('/reset', ({ Counter }: any) => Counter.get('test').reset())

	// 404 for everything else
	.all('*', () => missing('Are you sure about that?'));

// with itty, and using ES6 module syntax (required for DO), this is all you need
export default {
	fetch: router.handle,
};

/*
Example Interactions:

GET /counter                                => { counter: 0 }
GET /counter/increment                      => { counter: 1 }
GET /counter/increment                      => { counter: 2 }
GET /counter/increment                      => { counter: 3 }
GET /counter/reset                          => { counter: 0 }
GET /counter/add/20/3                       => 23
*/
