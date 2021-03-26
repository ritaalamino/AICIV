class Store {
	constructor() {
		this.listeners = [];
	}


	get(key, val) {
		const item = window.localStorage.getItem(key);
		if (!item) {
			this.set(key, val);
		}
		return item ? JSON.parse(item) : val;
	}

	set(key, value) {
		window.localStorage.setItem(key, JSON.stringify(value));
		// notifica os ouvintes dessa modificação
		this.listeners.filter(([k, _]) => key === k).forEach(([_, callback]) => {
			if (typeof callback === "function") {
				callback(value);
			}
		})
	}

	observe(key, callback) {
		this.listeners.push([key, callback]);
		return this;
	}
}