data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../../../app/api/dist"
  output_path = "${path.module}/lambda.zip"
}

resource "aws_iam_role" "lambda_role" {
  name = "qr-presence-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      },
    ]
  })
}

resource "aws_lambda_function" "check_in" {
  function_name    = "qr-presence-check-in"
  role             = aws_iam_role.lambda_role.arn
  handler          = "checkIn.handler"
  runtime          = "nodejs20.x"
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  timeout          = 10

  environment {
    variables = {
      TABLE_NAME        = aws_dynamodb_table.main.name
      DYNAMODB_ENDPOINT = "http://floci:4566"
    }
  }
}
