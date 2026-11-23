import random


class Game2048:
    def __init__(self):
        self.board = [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ]

        self.score = 0
        self.merged_tiles = []
        self.won_announced = False

        self.add_random_tile()
        self.add_random_tile()

    def add_random_tile(self):
        empty_cells = []

        for row in range(4):
            for column in range(4):
                if self.board[row][column] == 0:
                    empty_cells.append((row, column))

        if not empty_cells:
            return

        row, column = random.choice(empty_cells)
        self.board[row][column] = random.choice([2, 2, 2, 2, 4])

    def merge_row_left(self, row):
        numbers = [number for number in row if number != 0]

        for i in range(len(numbers) - 1):
            if numbers[i] == numbers[i + 1]:
                numbers[i] *= 2
                self.score += numbers[i]

                self.merged_tiles.append(numbers[i])

                numbers[i + 1] = 0

        numbers = [number for number in numbers if number != 0]

        while len(numbers) < 4:
            numbers.append(0)

        return numbers

    def move_left(self):
        for row in range(4):
            self.board[row] = self.merge_row_left(self.board[row])

    def move_right(self):
        for row in range(4):
            reversed_row = self.board[row][::-1]
            merged_row = self.merge_row_left(reversed_row)
            self.board[row] = merged_row[::-1]

    def transpose_board(self):
        self.board = [list(row) for row in zip(*self.board)]

    def move_up(self):
        self.transpose_board()
        self.move_left()
        self.transpose_board()

    def move_down(self):
        self.transpose_board()
        self.move_right()
        self.transpose_board()

    def move(self, direction):
        old_board = [row[:] for row in self.board]

        self.merged_tiles = []

        if direction == "left":
            self.move_left()
        elif direction == "right":
            self.move_right()
        elif direction == "up":
            self.move_up()
        elif direction == "down":
            self.move_down()

        board_changed = self.board != old_board

        if board_changed:
            self.add_random_tile()

        return board_changed

    def is_game_over(self):
        for row in self.board:
            if 0 in row:
                return False

        for row in range(4):
            for column in range(3):
                if self.board[row][column] == self.board[row][column + 1]:
                    return False

        for row in range(3):
            for column in range(4):
                if self.board[row][column] == self.board[row + 1][column]:
                    return False

        return True


if __name__ == "__main__":
    game = Game2048()

    for row in game.board:
        print(row)