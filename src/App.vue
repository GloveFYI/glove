<template>
  <Home />
</template>

<script>
import Home from './Home.vue'

export default {
  name: 'App',
  components: {
    Home
  }
}
</script>

<style lang="scss">
@import url("https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap");

$primary: #fff;
$background: #000;

body {
  font-family: "Courier Prime", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #111;
  color: #fff;
  padding: 0;
  margin: 0;
}

input, select, button {
  font-family: "Courier Prime";
  background: transparent;
  color: #ddd;
  border: 1px solid #fff;
  border-radius: 3px;
  padding: 10px 20px;
}

button, input[type="submit"] {
  cursor: pointer;
  color: #00fffc;
  font-weight: 700;
}

.bold {
  font-weight: 700;
}

.flex {
  display: flex;

  &.center {
    justify-content: center;
    align-items: center;
  }
}

.flex.j-center {
  justify-content: center;
}

.flex.a-center {
  justify-content: center;
}

.flex.row {
  flex-flow: row;
}

.flex.column {
  flex-flow: column;
}

.align-center {
  text-align: center;
}
</style>
